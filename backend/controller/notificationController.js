const Notification = require("../model/Notification");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");

// Every query is restricted to recipient = the logged-in user, so nobody can
// read or change another user's notifications.

// GET /api/notifications?unreadOnly=true&type=&page=&limit=
const listNotifications = async (req, res) => {
  const filter = { recipient: req.user._id };
  if (req.query.unreadOnly === "true") filter.isRead = false;
  if (req.query.type) filter.type = v.oneOf(req.query.type, "type", Notification.TYPES);
  const { page, limit, skip } = v.pagination(req.query);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);
  res.status(200).json({ total, unreadCount, page, limit, notifications });
};

// GET /api/notifications/unread-count
const unreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.status(200).json({ unreadCount: count });
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  const id = v.objectId(req.params.id, "notification id");
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { returnDocument: "after" }
  );
  if (!notification) throw new HttpError(404, "Notification not found");
  res.status(200).json({ notification });
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.status(200).json({ message: "All notifications marked as read", updated: result.modifiedCount });
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
