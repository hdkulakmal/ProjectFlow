const Meeting = require("../model/Meeting");
const Group = require("../model/Group");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");
const {
  loadStudentGroup,
  loadViewableGroup,
  canViewGroup,
  isMember,
  isGroupSupervisor,
  visibleGroupIds,
} = require("../utils/groupAccess");
const { notifyUsers } = require("../utils/notify");

const futureDate = (value, label, { required = true } = {}) => {
  const d = v.date(value, label, { required });
  if (d && d.getTime() < Date.now() - 60 * 1000) throw new HttpError(400, `${label} must be in the future`);
  return d;
};

const loadMeeting = async (user, id) => {
  const meeting = await Meeting.findById(v.objectId(id, "meeting id"))
    .populate("group", "groupNumber batch members supervisor")
    .populate("supervisor", "fullName email")
    .populate("requestedBy", "fullName email");
  if (!meeting || !meeting.group || !canViewGroup(user, meeting.group)) {
    throw new HttpError(404, "Meeting not found");
  }
  return meeting;
};

const fmt = (d) => (d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "");

// POST /api/meetings
//   Student:    { agenda, proposedAt? }               -> status Requested (to their supervisor)
//   Supervisor: { groupId, agenda, scheduledAt, location? } -> status Scheduled
const createMeeting = async (req, res) => {
  const input = v.body(req);
  const agenda = v.text(input.agenda, "agenda", { max: 2000 });

  if (req.user.role === "Student") {
    const group = await loadStudentGroup(req.user, { requireSupervisor: true });
    const meeting = await Meeting.create({
      group: group._id,
      supervisor: group.supervisor,
      requestedBy: req.user._id,
      agenda,
      proposedAt: futureDate(input.proposedAt, "proposedAt", { required: false }) || null,
    });
    await notifyUsers([group.supervisor], {
      type: "meeting_request",
      title: "Meeting requested",
      message: `Group ${group.groupNumber} requested a meeting${meeting.proposedAt ? ` for ${fmt(meeting.proposedAt)}` : ""}.`,
      refModel: "Meeting",
      refId: meeting._id,
    });
    return res.status(201).json({ message: "Meeting requested", meeting });
  }

  // Supervisor scheduling directly with one of their groups.
  const groupId = v.objectId(input.groupId, "groupId");
  const group = await Group.findById(groupId).lean();
  if (!group || !isGroupSupervisor(req.user, group)) throw new HttpError(403, "You can only schedule meetings with your own groups");

  const meeting = await Meeting.create({
    group: group._id,
    supervisor: req.user._id,
    requestedBy: req.user._id,
    agenda,
    scheduledAt: futureDate(input.scheduledAt, "scheduledAt"),
    location: v.text(input.location, "location", { required: false, max: 300 }) || "",
    status: "Scheduled",
  });
  await notifyUsers(group.members, {
    type: "meeting_update",
    title: "Meeting scheduled",
    message: `${req.user.fullName} scheduled a meeting for ${fmt(meeting.scheduledAt)}.`,
    refModel: "Meeting",
    refId: meeting._id,
  });
  res.status(201).json({ message: "Meeting scheduled", meeting });
};

// GET /api/meetings?groupId=&status=
const listMeetings = async (req, res) => {
  const filter = {};
  if (req.query.groupId) {
    const group = await loadViewableGroup(req.user, req.query.groupId);
    filter.group = group._id;
  } else {
    const ids = await visibleGroupIds(req.user);
    if (ids) filter.group = { $in: ids };
  }
  if (req.query.status) filter.status = v.oneOf(req.query.status, "status", Meeting.STATUSES);

  const meetings = await Meeting.find(filter)
    .sort({ createdAt: -1 })
    .populate("group", "groupNumber batch")
    .populate("supervisor", "fullName email")
    .populate("requestedBy", "fullName email")
    .lean();
  res.status(200).json({ count: meetings.length, meetings });
};

// GET /api/meetings/:id
const getMeeting = async (req, res) => {
  res.status(200).json({ meeting: await loadMeeting(req.user, req.params.id) });
};

// PATCH /api/meetings/:id/respond  (the meeting's supervisor)
// body: { action: "schedule", scheduledAt, location?, note? }  or  { action: "decline", note? }
// "schedule" also works on an already Scheduled meeting to reschedule it.
const respondToMeeting = async (req, res) => {
  const meeting = await loadMeeting(req.user, req.params.id);
  if (String(meeting.supervisor._id) !== String(req.user._id)) {
    throw new HttpError(403, "Only the supervisor of this meeting can respond");
  }
  const input = v.body(req);
  const action = v.oneOf(input.action, "action", ["schedule", "decline"]);
  const note = v.text(input.note, "note", { required: false, max: 2000 });

  if (action === "schedule") {
    if (!["Requested", "Scheduled"].includes(meeting.status)) {
      throw new HttpError(409, `A ${meeting.status.toLowerCase()} meeting cannot be scheduled`);
    }
    meeting.scheduledAt = futureDate(input.scheduledAt ?? meeting.proposedAt, "scheduledAt");
    if (input.location !== undefined) meeting.location = v.text(input.location, "location", { required: false, max: 300 }) || "";
    meeting.status = "Scheduled";
  } else {
    if (meeting.status !== "Requested") throw new HttpError(409, "Only requested meetings can be declined");
    meeting.status = "Declined";
  }
  if (note !== undefined) meeting.note = note;
  await meeting.save();

  await notifyUsers(meeting.group.members, {
    type: "meeting_update",
    title: action === "schedule" ? "Meeting scheduled" : "Meeting declined",
    message:
      action === "schedule"
        ? `Your meeting is scheduled for ${fmt(meeting.scheduledAt)}${meeting.location ? ` at ${meeting.location}` : ""}.`
        : `${req.user.fullName} declined the meeting request.${meeting.note ? ` Note: ${meeting.note}` : ""}`,
    refModel: "Meeting",
    refId: meeting._id,
  });

  res.status(200).json({ message: action === "schedule" ? "Meeting scheduled" : "Meeting declined", meeting });
};

// PATCH /api/meetings/:id/cancel  (a student of the group or the supervisor)
const cancelMeeting = async (req, res) => {
  const meeting = await loadMeeting(req.user, req.params.id);
  const isSup = String(meeting.supervisor._id) === String(req.user._id);
  if (!isSup && !isMember(req.user, meeting.group)) throw new HttpError(403, "You cannot cancel this meeting");
  if (!["Requested", "Scheduled"].includes(meeting.status)) {
    throw new HttpError(409, `A ${meeting.status.toLowerCase()} meeting cannot be cancelled`);
  }
  meeting.status = "Cancelled";
  meeting.cancelledBy = req.user._id;
  await meeting.save();

  const others = [...meeting.group.members, meeting.supervisor._id].filter((id) => String(id) !== String(req.user._id));
  await notifyUsers(others, {
    type: "meeting_update",
    title: "Meeting cancelled",
    message: `${req.user.fullName} cancelled the meeting.`,
    refModel: "Meeting",
    refId: meeting._id,
  });
  res.status(200).json({ message: "Meeting cancelled", meeting });
};

// PATCH /api/meetings/:id/complete  (the meeting's supervisor)  body: { note? }
const completeMeeting = async (req, res) => {
  const meeting = await loadMeeting(req.user, req.params.id);
  if (String(meeting.supervisor._id) !== String(req.user._id)) {
    throw new HttpError(403, "Only the supervisor of this meeting can complete it");
  }
  if (meeting.status !== "Scheduled") throw new HttpError(409, "Only scheduled meetings can be completed");
  const note = v.text(v.body(req).note, "note", { required: false, max: 2000 });
  if (note !== undefined) meeting.note = note;
  meeting.status = "Completed";
  await meeting.save();
  res.status(200).json({ message: "Meeting marked as completed", meeting });
};

module.exports = {
  createMeeting,
  listMeetings,
  getMeeting,
  respondToMeeting,
  cancelMeeting,
  completeMeeting,
};
