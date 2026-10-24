
const mongoose = require('mongoose');

const ganttTaskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Progress percentage: 0 to 100
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },

  // Student requests completion; supervisor reviews it
  completionRequested: {
    type: Boolean,
    default: false
  },

  approvalStatus: {
    type: String,
    enum: ['Not Requested', 'Pending', 'Approved', 'Rejected'],
    default: 'Not Requested'
  },

  completionRequestedAt: {
    type: Date,
    default: null
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  reviewedAt: {
    type: Date,
    default: null
  },

  reviewComment: {
    type: String,
    default: ''
  }
});

const ganttChartSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    unique: true
  },

  tasks: [ganttTaskSchema],

  // Existing whole-chart finalization fields retained
  isFinalized: {
    type: Boolean,
    default: false
  },

  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GanttChart', ganttChartSchema);
