const socket = io();

const taskList = document.getElementById('task-list');
const logsContainer = document.getElementById('logs-container');
const recordBtn = document.getElementById('record-btn');
const startSchedulerBtn = document.getElementById('start-scheduler-btn');
const stopSchedulerBtn = document.getElementById('stop-scheduler-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Fetch and display tasks
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();

        taskList.innerHTML = '';

        if (data.tasks.length === 0) {
            taskList.innerHTML = '<div class="task-card">No tasks found.</div>';
            return;
        }

        data.tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${task}</span>
                </div>
                <div class="task-icon">▶</div>
            `;

            card.addEventListener('click', () => runTask(task));
            taskList.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading tasks:', error);
        taskList.innerHTML = '<div style="color: var(--danger)">Error loading tasks.</div>';
    }
}

// Run a task
async function runTask(taskName) {
    appendLog(`Requesting to run task: ${taskName}...`, 'system');
    try {
        await fetch('/api/run-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskName })
        });
    } catch (error) {
        appendLog(`Error starting task: ${error.message}`, 'system');
    }
}

// Record new task
recordBtn.addEventListener('click', async () => {
    appendLog('Starting Recorder...', 'system');
    try {
        await fetch('/api/record', { method: 'POST' });
    } catch (error) {
        appendLog(`Error starting recorder: ${error.message}`, 'system');
    }
});

// Scheduler Controls
startSchedulerBtn.addEventListener('click', async () => {
    appendLog('Starting Scheduler...', 'system');
    try {
        const res = await fetch('/api/scheduler/start', { method: 'POST' });
        const data = await res.json();
        appendLog(data.message, 'system');
    } catch (error) {
        appendLog(`Error starting scheduler: ${error.message}`, 'system');
    }
});

stopSchedulerBtn.addEventListener('click', async () => {
    appendLog('Stopping Scheduler...', 'system');
    try {
        const res = await fetch('/api/scheduler/stop', { method: 'POST' });
        const data = await res.json();
        appendLog(data.message, 'system');
    } catch (error) {
        appendLog(`Error stopping scheduler: ${error.message}`, 'system');
    }
});

// Logs
function appendLog(message, type = 'normal') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
});

// Socket.io listeners
socket.on('log', (message) => {
    appendLog(message);
});

// Initialize
loadTasks();
