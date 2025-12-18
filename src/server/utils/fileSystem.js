const fs = require('fs');
const path = require('path');
const { TASKS_DIR } = require('../config');

const getTasksFromDir = (dirName) => {
    const dirPath = path.join(TASKS_DIR, dirName);
    if (fs.existsSync(dirPath)) {
        return fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.js'))
            .map(f => ({
                name: f.replace('.js', ''),
                type: dirName === 'public' ? 'public' : (dirName === 'private' ? 'private' : 'root')
            }));
    }
    return [];
};

module.exports = {
    getTasksFromDir
};
