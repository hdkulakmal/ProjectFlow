const Announcement = require("../model/Announcement");
const Notification = require("../model/Notification");
const User = require("../model/User");
const Group = require("../model/Group");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");
const { notifyUsers } = require("../utils/notify");

// Students in a batch: those in a group of that batch, or whose profile batch matches.
const studentIdsForBatch = async (batch) => {
  const groups = await Group.find({ batch }).select("members").lean();
  const fromGroups = groups.flatMap((g) => g.members || []);
  const fromProfile = await User.find({ role: "Student", batch }).select("_id").lean();
  return [...fromGroups, ...fromProfile.map((u) => u._id)];
};

const recipientsFor = async ({ audience, batch }) => {
  const active = { isActive: { $ne: false } };
  const ids = [];
  if (audience === "All" || audience === "Supervisors") {
    const sups = await User.find({ role: "Supervisor", ...active }).select("_id").lean();
    ids.push(...sups.map((u) => u._id));
  }
  if (audience === "All" || audience === "Students") {
    if (batch) {
      const batchIds = await studentIdsForBatch(batch);
      const students = await User.find({ _id: { $in: batchIds }, role: "Student", ...active }).select("_id").lean();
      ids.push(...students.map((u) => u._id));
    } else {
      const students = await User.find({ role: "Student", ...active }).select("_id").lean();
      ids.push(...students.map((u) => u._id));
    }
  }
  return ids;
};

// The batch a student belongs to (their group's batch, else their profile batch).
const studentBatch = async (user) => {
  const group = await Group.findOne({ members: user._id }).select("batch").lean();
  return group?.batch || user.batch || null;
};

// Mongo filter of announcements this user may read.
const visibilityFilter = async (user) => {
  if (user.role === "Coordinator") return {};
  if (user.role === "Supervisor") return { audience: { $in: ["All", "Supervisors"] } };
  const batch = await studentBatch(user);
  return {
    audience: { $in: ["All", "Students"] },
    $or: [{ batch: null }, { batch: { $exists: false } }, ...(batch ? [{ batch }] : [])],
  };
};

const readFields = (input, { partial = false } = {}) => {
  const out = {};
  if (!partial || input.title !== undefined) out.title = v.text(input.title, "Title", { max: 200 });
  if (!partial || input.message !== undefined) out.message = v.text(input.message, "Message", { max: 5000 });
  if (input.category !== undefined) out.category = v.oneOf(input.category, "category", Announcement.CATEGORIES);
  if (input.eventDate !== undefined) out.eventDate = input.eventDate ? v.date(input.eventDate, "eventDate") : null;
  return out;
};

// POST /api/announcements  (Coordinator)
// body: { title, message, category?, audience?: All|Students|Supervisors, batch?, eventDate? }
const createAnnouncement = async (req, res) => {
  const input = v.body(req);
  const fields = readFields(input);
  const audience = v.oneOf(input.audience ?? "All", "audience", Announcement.AUDIENCES);
  const batch = v.text(input.batch == null ? undefined : String(input.batch), "batch", { required: false, max: 50 }) || null;
  if (batch && audience === "Supervisors") {
    throw new HttpError(400, "batch only applies to announcements for students");
  }

  const announcement = await Announcement.create({
    ...fields,
    audience,
    batch,
    createdBy: req.user._id,
  });

  const recipients = await recipientsFor({ audience, batch });
  const created = await notifyUsers(recipients, {
    type: "announcement",
    title: announcement.title,
    message: announcement.message.slice(0, 300),
    refModel: "Announcement",
    refId: announcement._id,
    announcement: announcement._id,
  });

  res.status(201).json({
    message: "Announcement published",
    announcement,
    notifiedUsers: created.length,
  });
};

// GET /api/announcements?category=&page=&limit=  (everyone, filtered by audience)
const listAnnouncements = async (req, res) => {
  const filter = await visibilityFilter(req.user);
  if (req.query.category) filter.category = v.oneOf(req.query.category, "category", Announcement.CATEGORIES);
  const { page, limit, skip } = v.pagination(req.query);

  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "fullName")
      .lean(),
    Announcement.countDocuments(filter),
  ]);
  res.status(200).json({ total, page, limit, announcements });
};

// GET /api/announcements/:id
const getAnnouncement = async (req, res) => {
  const id = v.objectId(req.params.id, "announcement id");
  const filter = { ...(await visibilityFilter(req.user)), _id: id };
  const announcement = await Announcement.findOne(filter).populate("createdBy", "fullName").lean();
  if (!announcement) throw new HttpError(404, "Announcement not found");
  res.status(200).json({ announcement });
};

// PUT /api/announcements/:id  (Coordinator) - edit text, category or date.
// The audience cannot change after publishing (people were already notified).
const updateAnnouncement = async (req, res) => {
  const id = v.objectId(req.params.id, "announcement id");
  const input = v.body(req);
  const blocked = Object.keys(input).filter((k) => !["title", "message", "category", "eventDate"].includes(k));
  if (blocked.length) {
    throw new HttpError(400, `These fields cannot be changed after publishing: ${blocked.join(", ")}`);
  }
  const fields = readFields(input, { partial: true });
  if (!Object.keys(fields).length) throw new HttpError(400, "Nothing to update");

  const announcement = await Announcement.findByIdAndUpdate(
    id,
    { ...fields, updatedBy: req.user._id },
    { returnDocument: "after", runValidators: true }
  );
  if (!announcement) throw new HttpError(404, "Announcement not found");

  // Keep the copied text in recipients' notifications in step.
  await Notification.updateMany(
    { announcement: announcement._id },
    { title: announcement.title, message: announcement.message.slice(0, 300) }
  );
  res.status(200).json({ message: "Announcement updated", announcement });
};

// DELETE /api/announcements/:id  (Coordinator) - also removes its notifications.
const deleteAnnouncement = async (req, res) => {
  const id = v.objectId(req.params.id, "announcement id");
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) throw new HttpError(404, "Announcement not found");
  const removed = await Notification.deleteMany({ announcement: id });
  res.status(200).json({ message: "Announcement deleted", notificationsRemoved: removed.deletedCount });
};

module.exports = {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  recipientsFor,
};
