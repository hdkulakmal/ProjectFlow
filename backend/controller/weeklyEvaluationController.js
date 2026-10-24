const WeeklyEvaluation = require("../model/WeeklyEvaluation");
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
const { toFileMeta, removeFiles, sendStoredFile } = require("../middleware/privateUpload");
const { notifyUsers } = require("../utils/notify");

const GROUP_FIELDS = "groupNumber batch members supervisor";

const loadEvaluation = async (user, id) => {
  const evaluation = await WeeklyEvaluation.findById(v.objectId(id, "evaluation id"))
    .populate("group", GROUP_FIELDS)
    .populate("submittedBy", "fullName email")
    .populate("feedbackBy", "fullName email");
  if (!evaluation || !evaluation.group || !canViewGroup(user, evaluation.group)) {
    throw new HttpError(404, "Weekly evaluation not found");
  }
  return evaluation;
};

// POST /api/weekly-evaluations  (Student; multipart: weekNumber, workSummary, files[] optional)
const createWeeklyEvaluation = async (req, res) => {
  try {
    const input = v.body(req);
    const group = await loadStudentGroup(req.user, { requireSupervisor: true });
    const weekNumber = v.integer(input.weekNumber, "weekNumber", { min: 1, max: 60 });
    const workSummary = v.text(input.workSummary, "workSummary", { max: 5000 });

    const existing = await WeeklyEvaluation.exists({ group: group._id, weekNumber });
    if (existing) throw new HttpError(409, `Week ${weekNumber} has already been submitted. Edit it instead.`);

    const evaluation = await WeeklyEvaluation.create({
      group: group._id,
      weekNumber,
      workSummary,
      attachments: (req.files || []).map(toFileMeta),
      submittedBy: req.user._id,
    });

    await notifyUsers([group.supervisor], {
      type: "weekly_submission",
      title: `Week ${weekNumber} submitted`,
      message: `Group ${group.groupNumber} submitted their week ${weekNumber} work.`,
      refModel: "WeeklyEvaluation",
      refId: evaluation._id,
    });

    res.status(201).json({ message: "Weekly work submitted", evaluation });
  } catch (error) {
    removeFiles(req.files);
    if (error.code === 11000) throw new HttpError(409, "This week has already been submitted.");
    throw error;
  }
};

// GET /api/weekly-evaluations?groupId=&weekNumber=
const listWeeklyEvaluations = async (req, res) => {
  const filter = {};
  if (req.query.groupId) {
    const group = await loadViewableGroup(req.user, req.query.groupId);
    filter.group = group._id;
  } else {
    const ids = await visibleGroupIds(req.user);
    if (ids) filter.group = { $in: ids };
  }
  if (req.query.weekNumber) filter.weekNumber = v.integer(req.query.weekNumber, "weekNumber", { min: 1, max: 60 });

  const evaluations = await WeeklyEvaluation.find(filter)
    .sort({ weekNumber: 1 })
    .populate("group", "groupNumber batch")
    .populate("submittedBy", "fullName email")
    .populate("feedbackBy", "fullName email")
    .lean();
  res.status(200).json({ count: evaluations.length, evaluations });
};

// GET /api/weekly-evaluations/:id
const getWeeklyEvaluation = async (req, res) => {
  res.status(200).json({ evaluation: await loadEvaluation(req.user, req.params.id) });
};

// PUT /api/weekly-evaluations/:id  (Student of the group, before feedback)  body: { workSummary }
const updateWeeklyEvaluation = async (req, res) => {
  const evaluation = await loadEvaluation(req.user, req.params.id);
  if (!isMember(req.user, evaluation.group)) throw new HttpError(403, "Only students in this group can edit it");
  if (evaluation.status === "Reviewed") {
    throw new HttpError(409, "This week already has feedback and can no longer be edited.");
  }
  evaluation.workSummary = v.text(v.body(req).workSummary, "workSummary", { max: 5000 });
  await evaluation.save();
  res.status(200).json({ message: "Weekly work updated", evaluation });
};

// PATCH /api/weekly-evaluations/:id/feedback  (Supervisor of the group)  body: { feedback }
const giveFeedback = async (req, res) => {
  const evaluation = await loadEvaluation(req.user, req.params.id);
  if (!isGroupSupervisor(req.user, evaluation.group)) {
    throw new HttpError(403, "Only this group's supervisor can give feedback");
  }
  evaluation.feedback = v.text(v.body(req).feedback, "feedback", { max: 5000 });
  evaluation.feedbackBy = req.user._id;
  evaluation.feedbackAt = new Date();
  evaluation.status = "Reviewed";
  await evaluation.save();

  await notifyUsers(evaluation.group.members, {
    type: "weekly_feedback",
    title: `Feedback for week ${evaluation.weekNumber}`,
    message: `${req.user.fullName} reviewed your week ${evaluation.weekNumber} work.`,
    refModel: "WeeklyEvaluation",
    refId: evaluation._id,
  });

  res.status(200).json({ message: "Feedback saved", evaluation });
};

// GET /api/weekly-evaluations/:id/files/:fileId  (anyone who can view the group)
const downloadAttachment = async (req, res) => {
  const evaluation = await loadEvaluation(req.user, req.params.id);
  const fileId = v.objectId(req.params.fileId, "file id");
  const file = evaluation.attachments.id(fileId);
  if (!file) throw new HttpError(404, "File not found");
  sendStoredFile(res, file);
};

module.exports = {
  createWeeklyEvaluation,
  listWeeklyEvaluations,
  getWeeklyEvaluation,
  updateWeeklyEvaluation,
  giveFeedback,
  downloadAttachment,
};
