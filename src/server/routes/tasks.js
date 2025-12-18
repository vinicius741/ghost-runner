const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks');

router.get('/tasks', tasksController.getTasks);
router.post('/run-task', tasksController.runTask);
router.post('/record', tasksController.recordTask);
router.post('/setup-login', tasksController.setupLogin);

module.exports = router;
