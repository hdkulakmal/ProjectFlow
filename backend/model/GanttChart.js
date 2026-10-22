const mongoose = require('mongoose');

const ganttTaskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  progress: { type: Number, default: 0 }, // percentage 0-100
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
});

const ganttChartSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, unique: true },
  tasks: [ganttTaskSchema],
  isFinalized: { type: Boolean, default: false }, // Finalized by Supervisor
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GanttChart', ganttChartSchema);