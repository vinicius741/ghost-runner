const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/scheduler');

router.get('/scheduler/status', schedulerController.getStatus);
router.get('/scheduler/next-task', schedulerController.getNextTask);
router.post('/scheduler/start', schedulerController.start);
router.post('/scheduler/stop', schedulerController.stop);
router.get('/schedule', schedulerController.getSchedule);
router.post('/schedule', schedulerController.saveSchedule);

module.exports = router;
