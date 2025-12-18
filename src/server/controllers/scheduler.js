const fs = require('fs');
const { SCHEDULE_FILE } = require('../config');
const schedulerService = require('../services/scheduler');

exports.getStatus = (req, res) => {
    res.json({ running: schedulerService.isRunning() });
};

exports.start = (req, res) => {
    const io = req.app.get('io');
    if (schedulerService.isRunning()) {
        return res.json({ message: 'Scheduler is already running.' });
    }

    schedulerService.start(io);
    res.json({ message: 'Scheduler started.' });
};

exports.stop = (req, res) => {
    const io = req.app.get('io');
    if (schedulerService.stop(io)) {
        res.json({ message: 'Scheduler stopped.' });
    } else {
        res.json({ message: 'Scheduler is not running.' });
    }
};

exports.getSchedule = (req, res) => {
    if (fs.existsSync(SCHEDULE_FILE)) {
        fs.readFile(SCHEDULE_FILE, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read schedule file.' });
            }
            try {
                const schedule = JSON.parse(data);
                res.json({ schedule });
            } catch (e) {
                res.status(500).json({ error: 'Invalid JSON in schedule file.' });
            }
        });
    } else {
        res.json({ schedule: [] });
    }
};

exports.saveSchedule = (req, res) => {
    const io = req.app.get('io');
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
        return res.status(400).json({ error: 'Invalid schedule format. Expected an array.' });
    }

    fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to save schedule.' });
        }

        schedulerService.restart(io);

        res.json({ message: 'Schedule updated successfully.' });
    });
};
