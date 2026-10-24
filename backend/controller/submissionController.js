const Submission = require("../model/Submission");
const HttpError = require("../utils/httpError");
const v = require("../utils/validate");
const {
  loadStudentGroup,
  loadViewableGroup,
  canViewGroup,
  visibleGroupIds,
} = require("../utils/groupAccess");
const { toFileMeta, removeFiles, sendStoredFile } = require("../middleware/privateUpload");
const { notifyUsers } = require("../utils/notify");

const loadSubmission = async (user, id) => {
  const submission = await Submission.findById(v.objectId(id, "submission id"))
    .populate("group", "groupNumber batch members supervisor")
    .populate("submittedBy", "fullName email")
    .populate("evaluation.evaluatedBy", "fullName email");
  if (!submission || !submission.group || !canViewGroup(user, submission.group)) {
    throw new HttpError(404, "Submission not found");
  }
  return submission;
};

// Never send the internal stored file name to clients.
const toClient = (submission) => {
  const obj = submission.toObject ? submission.toObject() : { ...submission };
  if (obj.file) delete obj.file.storedName;
  return obj;
};

// POST /api/submissions  (Student; multipart: type, title, description?, file)
const createSubmission = async (req, res) => {
  try {
    if (!req.file) throw new HttpError(400, "A file is required (form field \"file\")");
    const input = v.body(req);
    const group = await loadStudentGroup(req.user, { requireSupervisor: true });

    const submission = await Submission.create({
      group: group._id,
      type: v.oneOf(input.type, "type", Submission.TYPES),
      title: v.text(input.title, "title", { max: 200 }),
      description: v.text(input.description, "description", { required: false, max: 2000 }) || "",
      file: toFileMeta(req.file),
      submittedBy: req.user._id,
    });

    await notifyUsers([group.supervisor], {
      type: "submission",
      title: `New ${submission.type.toLowerCase()} submitted`,
      message: `Group ${group.groupNumber} submitted "${submission.title}".`,
      refModel: "Submission",
      refId: submission._id,
    });

    res.status(201).json({ message: "Document submitted", submission: toClient(submission) });
  } catch (error) {
    removeFiles(req.file ? [req.file] : []);
    throw error;
  }
};

// GET /api/submissions?groupId=&type=
const listSubmissions = async (req, res) => {
  const filter = {};
  if (req.query.groupId) {
    const group = await loadViewableGroup(req.user, req.query.groupId);
    filter.group = group._id;
  } else {
    const ids = await visibleGroupIds(req.user);
    if (ids) filter.group = { $in: ids };
  }
  if (req.query.type) filter.type = v.oneOf(req.query.type, "type", Submission.TYPES);

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .select("-file.storedName")
    .populate("group", "groupNumber batch")
    .populate("submittedBy", "fullName email")
    .populate("evaluation.evaluatedBy", "fullName email")
    .lean();
  res.status(200).json({ count: submissions.length, submissions });
};

// GET /api/submissions/:id
const getSubmission = async (req, res) => {
  res.status(200).json({ submission: toClient(await loadSubmission(req.user, req.params.id)) });
};

// GET /api/submissions/:id/download
const downloadSubmission = async (req, res) => {
  const submission = await loadSubmission(req.user, req.params.id);
  sendStoredFile(res, submission.file);
};

// PATCH /api/submissions/:id/evaluate  (Coordinator)  body: { comments, marks? (0-100) }
const evaluateSubmission = async (req, res) => {
  const submission = await loadSubmission(req.user, req.params.id);
  const input = v.body(req);
  const comments = v.text(input.comments, "comments", { max: 5000 });
  const marks = v.integer(input.marks, "marks", { min: 0, max: 100, required: false });

  submission.evaluation = {
    marks: marks === undefined ? null : marks,
    comments,
    evaluatedBy: req.user._id,
    evaluatedAt: new Date(),
  };
  submission.status = "Evaluated";
  await submission.save();

  await notifyUsers(submission.group.members, {
    type: "submission_evaluated",
    title: "Submission evaluated",
    message: `Your ${submission.type.toLowerCase()} "${submission.title}" has been evaluated.`,
    refModel: "Submission",
    refId: submission._id,
  });

  res.status(200).json({ message: "Evaluation saved", submission: toClient(submission) });
};

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmission,
  downloadSubmission,
  evaluateSubmission,
};
