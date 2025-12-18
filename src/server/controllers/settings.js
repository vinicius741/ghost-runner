const fs = require('fs');
const { SETTINGS_FILE } = require('../config');

exports.getSettings = (req, res) => {
    if (fs.existsSync(SETTINGS_FILE)) {
        fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read settings file.' });
            }
            try {
                const settings = JSON.parse(data);
                res.json({ settings });
            } catch (e) {
                res.status(500).json({ error: 'Invalid JSON in settings file.' });
            }
        });
    } else {
        res.json({ settings: {} });
    }
};

exports.saveSettings = (req, res) => {
    const io = req.app.get('io');
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings format.' });
    }

    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to save settings.' });
        }
        res.json({ message: 'Settings updated successfully.' });
        if (io) io.emit('log', '[System] Global settings updated via UI.');
    });
};
