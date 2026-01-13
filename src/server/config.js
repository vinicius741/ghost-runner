const path = require('path');

// We are assuming this file is in src/server/config/index.js or src/server/config.js,
// so __dirname relative to root/tasks needs adjustment.
// Original: path.resolve(__dirname, '../../tasks') from src/server/index.js
// If config.js is in src/server/, it's the same.

const ROOT_DIR = path.resolve(__dirname, '../../'); // Assuming src/server/config.js
// Wait, if I put it in src/server/config.js, the relative path to root is ../../..
// If I put it in src/server/config.js, __dirname is src/server

// Let's place it in src/server/config.js
// Actually, let's stick to the plan: src/server/config.js.
// Since it's in src/server/, path to ../../tasks is correct.

// Default port - will try this first, then find available if in use
const DEFAULT_PORT = 3333;

module.exports = {
    PORT: process.env.PORT || DEFAULT_PORT,
    TASKS_DIR: path.resolve(__dirname, '../../tasks'),
    LOG_FILE: path.resolve(__dirname, '../../scheduler.log'),
    SETTINGS_FILE: path.resolve(__dirname, '../../settings.json'),
    SCHEDULE_FILE: path.resolve(__dirname, '../../schedule.json'),
    ROOT_DIR: path.resolve(__dirname, '../../')
};
