const socket = io();

const taskList = document.getElementById('task-list');
const logsContainer = document.getElementById('logs-container');
const recordBtn = document.getElementById('record-btn');
const startSchedulerBtn = document.getElementById('start-scheduler-btn');
const stopSchedulerBtn = document.getElementById('stop-scheduler-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Schedule Builder Elements
const scheduleTaskSelect = document.getElementById('schedule-task-select');
const addScheduleBtn = document.getElementById('add-schedule-btn');
const scheduleList = document.getElementById('schedule-list');

// Cron Builder Elements
const cronTabs = document.querySelectorAll('.cron-tab');
const cronViews = document.querySelectorAll('.cron-view');
const cronPreviewText = document.getElementById('cron-preview-text');

const cronMinutesInput = document.getElementById('cron-minutes-input');
const cronHourlyInput = document.getElementById('cron-hourly-input');
const cronDailyInput = document.getElementById('cron-daily-input');

let availableTasks = [];
let currentSchedule = [];
let currentCronTab = 'minutes';

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

        availableTasks = data.tasks;
        populateTaskSelect();

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

// --- Schedule Builder Logic ---

function populateTaskSelect() {
    scheduleTaskSelect.innerHTML = '<option value="" disabled selected>Select Task...</option>';
    availableTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        scheduleTaskSelect.appendChild(option);
    });
}

async function loadSchedule() {
    try {
        const res = await fetch('/api/schedule');
        const data = await res.json();
        currentSchedule = data.schedule || [];
        renderSchedule();
    } catch (error) {
        console.error('Error loading schedule:', error);
        appendLog('Error loading schedule.', 'system');
    }
}

function renderSchedule() {
    scheduleList.innerHTML = '';
    if (currentSchedule.length === 0) {
        scheduleList.innerHTML = '<div style="color: var(--text-muted); padding: 1rem;">No scheduled tasks.</div>';
        return;
    }

    currentSchedule.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `
            <div>
                <span class="task-name">${item.task}</span>
                <span class="cron-badge">${item.cron}</span>
            </div>
            <button class="delete-btn" onclick="deleteScheduleItem(${index})">×</button>
        `;
        scheduleList.appendChild(div);
    });
}

async function saveSchedule() {
    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule: currentSchedule })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        appendLog('Schedule updated successfully.', 'system');
    } catch (error) {
        console.error('Error saving schedule:', error);
        appendLog(`Error saving schedule: ${error.message}`, 'system');
    }
}

// --- Cron Builder Logic ---

function updateCronPreview() {
    let cron = '* * * * *';

    if (currentCronTab === 'minutes') {
        const minutes = Math.max(1, Math.min(59, parseInt(cronMinutesInput.value) || 1));
        cron = `*/${minutes} * * * *`;
    } else if (currentCronTab === 'hourly') {
        const minute = Math.max(0, Math.min(59, parseInt(cronHourlyInput.value) || 0));
        cron = `${minute} * * * *`;
    } else if (currentCronTab === 'daily') {
        const time = cronDailyInput.value || '12:00';
        const [hour, minute] = time.split(':');
        cron = `${parseInt(minute)} ${parseInt(hour)} * * *`;
    }

    cronPreviewText.textContent = cron;
    return cron;
}

// Tab Switching
cronTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        cronTabs.forEach(t => t.classList.remove('active'));
        cronViews.forEach(v => v.classList.remove('active'));

        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        document.getElementById(`cron-${tabName}-view`).classList.add('active');

        currentCronTab = tabName;
        updateCronPreview();
    });
});

// Input Listeners
[cronMinutesInput, cronHourlyInput, cronDailyInput].forEach(input => {
    input.addEventListener('input', updateCronPreview);
    input.addEventListener('change', updateCronPreview);
});

// Initial Update
updateCronPreview();

addScheduleBtn.addEventListener('click', () => {
    const task = scheduleTaskSelect.value;
    const cron = updateCronPreview(); // Get current valid cron

    if (!task) {
        alert('Please select a task.');
        return;
    }

    currentSchedule.push({ task, cron });
    renderSchedule();
    saveSchedule();

    // Reset inputs to default state
    scheduleTaskSelect.value = '';

    // Reset cron builder to minutes default
    currentCronTab = 'minutes';
    cronTabs[0].click();
    cronMinutesInput.value = 15;
    updateCronPreview();
});

// Expose to window for inline onclick
window.deleteScheduleItem = (index) => {
    if (confirm('Are you sure you want to delete this schedule item?')) {
        currentSchedule.splice(index, 1);
        renderSchedule();
        saveSchedule();
    }
};

// Socket.io listeners
socket.on('log', (message) => {
    appendLog(message);
});

// Initialize
// Initialize
loadTasks();
loadSchedule();
