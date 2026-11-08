let supabaseUrl;
let supabaseKey;
let tableName;

let editingTaskId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

function showStatus(message) {
    statusMessage.textContent = message;
}

async function loadConfig() {
    const response = await fetch("config.json");

    if (!response.ok) {
        throw new Error("Could not load configuration");
    }

    const config = await response.json();

    supabaseUrl = config.supabaseUrl.replace(/\/$/, "");
    supabaseKey = config.supabasePublishableKey;
    tableName = config.tableName;

    if (!supabaseUrl || !supabaseKey || tableName !== "tasks") {
        throw new Error("Invalid Supabase configuration");
    }
}

async function apiRequest(method, endpoint, data = null) {
    const options = {
        method: method,
        headers: {
            "apikey": supabaseKey,
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/${tableName}${endpoint}`,
        options
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

async function loadTasks() {
    try {
        showStatus("Loading tasks...");

        const tasks = await apiRequest(
            "GET",
            "?select=*&order=id.asc"
        );

        taskList.innerHTML = "";

        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item";
            item.dataset.id = task.id;

            const title = document.createElement("h3");
            title.className = "task-title";
            title.textContent = task.title;

            const description = document.createElement("p");
            description.className = "task-description";
            description.textContent = task.description || "";

            const status = document.createElement("p");
            status.className = "task-status";
            status.textContent = task.completed
                ? "Completed"
                : "Incomplete";

            const editButton = document.createElement("button");
            editButton.className = "edit-task";
            editButton.textContent = "Edit";
            editButton.onclick = () => editTask(task);

            const toggleButton = document.createElement("button");
            toggleButton.className = "toggle-task";
            toggleButton.textContent = task.completed
                ? "Mark Incomplete"
                : "Mark Complete";
            toggleButton.onclick = () => toggleTask(task);

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-task";
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deleteTask(task.id);

            item.append(
                title,
                description,
                status,
                editButton,
                toggleButton,
                deleteButton
            );

            taskList.appendChild(item);
        });

        showStatus(`Loaded ${tasks.length} tasks`);
    } catch (error) {
        showStatus(error.message);
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        showStatus("Task title is required");
        return;
    }

    try {
        if (editingTaskId === null) {
            await apiRequest("POST", "", {
                title: title,
                description: description,
                completed: false
            });

            showStatus("Task created");
        } else {
            await apiRequest(
                "PATCH",
                `?id=eq.${editingTaskId}`,
                {
                    title: title,
                    description: description
                }
            );

            showStatus("Task updated");
        }

        resetForm();
        await loadTasks();
    } catch (error) {
        showStatus(error.message);
    }
});

function editTask(task) {
    editingTaskId = task.id;

    titleInput.value = task.title;
    descriptionInput.value = task.description || "";

    submitButton.textContent = "Update Task";
    titleInput.focus();
}

async function toggleTask(task) {
    try {
        await apiRequest(
            "PATCH",
            `?id=eq.${task.id}`,
            {
                completed: !task.completed
            }
        );

        await loadTasks();
    } catch (error) {
        showStatus(error.message);
    }
}

async function deleteTask(id) {
    try {
        await apiRequest(
            "DELETE",
            `?id=eq.${id}`
        );

        if (editingTaskId === id) {
            resetForm();
        }

        await loadTasks();
    } catch (error) {
        showStatus(error.message);
    }
}

function resetForm() {
    editingTaskId = null;
    form.reset();
    submitButton.textContent = "Save Task";
}

async function initializeApp() {
    try {
        await loadConfig();
        await loadTasks();
    } catch (error) {
        showStatus(error.message);
    }
}

initializeApp();
