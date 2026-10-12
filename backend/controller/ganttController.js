const GanttChart = require('../model/GanttChart');

// 1. Student: Create or Update Gantt Chart Tasks
const saveOrUpdateGantt = async (req, res) => {
  try {
    const { groupId, tasks } = req.body;
    
    let chart = await GanttChart.findOne({ groupId });
    if (chart && chart.isFinalized) {
      return res.status(400).json({ message: 'Cannot modify Gantt chart after it has been finalized by a supervisor.' });
    }

    if (chart) {
      chart.tasks = tasks;
      chart.updatedAt = Date.now();
      await chart.save();
    } else {
      chart = new GanttChart({ groupId, tasks });
      await chart.save();
    }

    res.status(200).json({ message: 'Gantt chart saved successfully', chart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Supervisor: Finalize Gantt Chart
const finalizeGanttChart = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const chart = await GanttChart.findOne({ groupId });
    if (!chart) {
      return res.status(404).json({ message: 'Gantt chart not found for this group.' });
    }

    chart.isFinalized = true;
    chart.finalizedBy = req.user._id; // from auth middleware
    await chart.save();

    res.status(200).json({ message: 'Gantt chart finalized successfully by supervisor', chart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Coordinator / All: View Gantt Chart by Group or All Finalized
const getGanttCharts = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (groupId) {
      const chart = await GanttChart.findOne({ groupId }).populate('finalizedBy', 'name email');
      return res.status(200).json(chart);
    }

    // Coordinator view: get all charts across groups
    const charts = await GanttChart.find().populate('groupId').populate('finalizedBy', 'name email');
    res.status(200).json(charts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { saveOrUpdateGantt, finalizeGanttChart, getGanttCharts };