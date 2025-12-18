const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs');

router.get('/logs', logsController.getLogs);

module.exports = router;
