const express = require('express');
const router = express.Router();
const { saveOrUpdateGantt, finalizeGanttChart, getGanttCharts } = require('../controller/ganttController');
const { authMiddleware } = require('../middleware/authMiddleware'); // Adjust path as needed
const { roleMiddleware } = require('../middleware/roleMiddleware');

// Student routes
router.post('/save', authMiddleware, roleMiddleware(['student']), saveOrUpdateGantt);

// Supervisor routes
router.patch('/finalize/:groupId', authMiddleware, roleMiddleware(['supervisor']), finalizeGanttChart);

// Coordinator & General viewing routes
router.get('/:groupId?', authMiddleware, roleMiddleware(['coordinator', 'supervisor', 'student']), getGanttCharts);

module.exports = router;