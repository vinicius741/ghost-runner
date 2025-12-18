const fs = require('fs');
const { LOG_FILE } = require('../config');

exports.getLogs = (req, res) => {
    if (fs.existsSync(LOG_FILE)) {
        fs.readFile(LOG_FILE, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read log file.' });
            }
            res.json({ logs: data });
        });
    } else {
        res.json({ logs: 'No logs found.' });
    }
};
