const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings');

router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.saveSettings);

module.exports = router;
