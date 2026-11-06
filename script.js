/**
 * script.js — Task List
 *
 * Architecture:
 *   - State: single source of truth stored in `state` object + localStorage.
 *   - Render: pure render functions rebuild the DOM from state.
 *   - Events: delegated or direct listeners call state-mutating functions
 *             then re-render.
 *
 * No external libraries used.
 */

"use strict";

/* ============================================================
   STATE
   ============================================================ */

/**
 * Application state.
 * @type {{ tasks: Task[], filter: string, priorityFilter: string }}
 *
 * @typedef {{
 *   id: string,
 *   text: string,
 *   completed: boolean,
 *   priority: 'high'|'medium'|'low',
 *   createdAt: number
 * }} Task
 */
const state = {
  tasks: loadTasksFromStorage(),
  filter: "all",           // 'all' | 'active' | 'completed'
  priorityFilter: "all",   // 'all' | 'high' | 'medium' | 'low'
};

/* ============================================================
   STORAGE HELPERS
   ============================================================ */

/** Persist current tasks array to localStorage. */
function saveTasksToStorage() {
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
}

/** Load tasks from localStorage. Returns empty array if nothing stored. */
function loadTasksFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("tasks")) || [];
  } catch {
    return [];
  }
}

/* ============================================================
   TASK HELPERS
   ============================================================ */

/**
 * Generate a simple unique ID.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Return tasks filtered by both status filter and priority filter.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  let tasks = state.tasks;

  // Status filter
  if (state.filter === "active") {
    tasks = tasks.filter((t) => !t.completed);
  } else if (state.filter === "completed") {
    tasks = tasks.filter((t) => t.completed);
  }

  // Priority filter
  if (state.priorityFilter !== "all") {
    tasks = tasks.filter((t) => t.priority === state.priorityFilter);
  }

  return tasks;
}

/** Count of tasks that are NOT yet completed. */
function activeCount() {
  return state.tasks.filter((t) => !t.completed).length;
}

/** Count of completed tasks. */
function completedCount() {
  return state.tasks.filter((t) => t.completed).length;
}

/* ============================================================
   PRIORITY CONFIG
   ============================================================ */

/**
 * Visual config for each priority level.
 * Provides the badge CSS class and display label.
 */
const PRIORITY_CONFIG = {
  high:   { label: "High",   badgeClass: "priority-badge--high"   },
  medium: { label: "Medium", badgeClass: "priority-badge--medium" },
  low:    { label: "Low",    badgeClass: "priority-badge--low"    },
};

/* ============================================================
   CRUD OPERATIONS
   ============================================================ */

/**
 * Add a new task.
 * @param {string} text
 * @param {'high'|'medium'|'low'} priority
 */
function addTask(text, priority) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  /** @type {Task} */
  const task = {
    id: generateId(),
    text: trimmed,
    completed: false,
    priority: priority || "medium",
    createdAt: Date.now(),
  };

  state.tasks.unshift(task); // newest task at the top
  saveTasksToStorage();
  return true;
}

/**
 * Toggle the completed status of a task.
 * @param {string} id
 */
function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasksToStorage();
}

/**
 * Update the text and/or priority of an existing task.
 * @param {string} id
 * @param {string} newText
 * @param {'high'|'medium'|'low'} newPriority
 */
function updateTask(id, newText, newPriority) {
  const trimmed = newText.trim();
  if (!trimmed) return false;

  const task = state.tasks.find((t) => t.id === id);
  if (!task) return false;

  task.text = trimmed;
  task.priority = newPriority || task.priority;
  saveTasksToStorage();
  return true;
}

/**
 * Delete a task by ID.
 * @param {string} id
 */
function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasksToStorage();
}

/** Remove all completed tasks from the list. */
function clearCompleted() {
  state.tasks = state.tasks.filter((t) => !t.completed);
  saveTasksToStorage();
}

/* ============================================================
   DOM REFERENCES
   ============================================================ */

const taskForm          = document.getElementById("task-form");
const taskInput         = document.getElementById("task-input");
const prioritySelect    = document.getElementById("priority-select");
const inputError        = document.getElementById("input-error");
const taskList          = document.getElementById("task-list");
const emptyState        = document.getElementById("empty-state");
const taskCount         = document.getElementById("task-count");
const clearBtn          = document.getElementById("clear-completed");
const filterBtns        = document.querySelectorAll(".filter-btn");
const priorityBtns      = document.querySelectorAll(".priority-btn");

// Edit modal
const editModal         = document.getElementById("edit-modal");
const editInput         = document.getElementById("edit-input");
const editPrioritySelect = document.getElementById("edit-priority-select");
const editError         = document.getElementById("edit-error");
const modalCancel       = document.getElementById("modal-cancel");
const modalSave         = document.getElementById("modal-save");

// Dark mode toggle
const themeToggleBtn    = document.getElementById("theme-toggle");
const iconSun           = document.getElementById("icon-sun");
const iconMoon          = document.getElementById("icon-moon");

/** ID of the task currently being edited (set when modal opens). */
let editingTaskId = null;

/* ============================================================
   RENDER
   ============================================================ */

/**
 * Build one <li> element for a task.
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = task.id;

  // ── Checkbox ──────────────────────────────────────────────
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`
  );

  // ── Priority badge ─────────────────────────────────────────
  const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const badge = document.createElement("span");
  badge.className = `priority-badge ${cfg.badgeClass}`;
  badge.textContent = cfg.label;
  badge.setAttribute("aria-label", `Priority: ${cfg.label}`);

  // ── Label ──────────────────────────────────────────────────
  const label = document.createElement("span");
  label.className = "task-label" + (task.completed ? " completed" : "");
  label.textContent = task.text;

  // ── Action buttons ─────────────────────────────────────────
  const actions = document.createElement("div");
  actions.className = "task-actions";

  // Edit button
  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon btn-edit";
  editBtn.setAttribute("aria-label", `Edit "${task.text}"`);
  editBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-icon btn-delete";
  deleteBtn.setAttribute("aria-label", `Delete "${task.text}"`);
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  // Assemble: checkbox — badge — label — actions
  li.appendChild(checkbox);
  li.appendChild(badge);
  li.appendChild(label);
  li.appendChild(actions);

  // ── Event listeners on this item ───────────────────────────
  checkbox.addEventListener("change", () => {
    toggleTask(task.id);
    render();
  });

  editBtn.addEventListener("click", () =>
    openEditModal(task.id, task.text, task.priority)
  );

  deleteBtn.addEventListener("click", () => {
    deleteTask(task.id);
    render();
  });

  return li;
}

/**
 * Re-render the full task list and all dynamic UI elements.
 * Called after every state mutation.
 */
function render() {
  const filtered = getFilteredTasks();

  // Clear list
  taskList.innerHTML = "";

  // Render each task
  filtered.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  // Empty state visibility
  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
  } else {
    emptyState.classList.add("hidden");
    emptyState.classList.remove("flex");
  }

  // Footer count ("1 item left" vs "N items left")
  const left = activeCount();
  taskCount.textContent = `${left} ${left === 1 ? "item" : "items"} left`;

  // Clear completed button — disable when nothing to clear
  clearBtn.disabled = completedCount() === 0;

  // Sync status filter tab active styles
  filterBtns.forEach((btn) => {
    if (btn.dataset.filter === state.filter) {
      btn.classList.add("active-filter");
    } else {
      btn.classList.remove("active-filter");
    }
  });

  // Sync priority filter button active styles
  priorityBtns.forEach((btn) => {
    if (btn.dataset.priority === state.priorityFilter) {
      btn.classList.add("active-priority-filter");
    } else {
      btn.classList.remove("active-priority-filter");
    }
  });
}

/* ============================================================
   EDIT MODAL HELPERS
   ============================================================ */

/**
 * Open the edit modal pre-filled with the task's current text and priority.
 * @param {string} id
 * @param {string} currentText
 * @param {'high'|'medium'|'low'} currentPriority
 */
function openEditModal(id, currentText, currentPriority) {
  editingTaskId = id;
  editInput.value = currentText;
  editPrioritySelect.value = currentPriority || "medium";
  editError.classList.add("hidden");

  editModal.classList.remove("hidden");
  editModal.classList.add("flex");
  editInput.focus();
  editInput.select();
}

/** Close and reset the edit modal. */
function closeEditModal() {
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
  editingTaskId = null;
}

/** Save the edit (text + priority) and close the modal. */
function saveEdit() {
  const newText = editInput.value.trim();
  if (!newText) {
    editError.classList.remove("hidden");
    editInput.focus();
    return;
  }
  editError.classList.add("hidden");

  const newPriority = editPrioritySelect.value;
  if (updateTask(editingTaskId, newText, newPriority)) {
    closeEditModal();
    render();
  }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// ── Add task form ──────────────────────────────────────────────
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value;

  if (!text.trim()) {
    inputError.classList.remove("hidden");
    taskInput.focus();
    return;
  }

  inputError.classList.add("hidden");
  addTask(text, prioritySelect.value);
  taskInput.value = "";
  // Reset priority selector to default after adding
  prioritySelect.value = "medium";
  taskInput.focus();
  render();
});

// Hide error while user is typing
taskInput.addEventListener("input", () => {
  if (taskInput.value.trim()) {
    inputError.classList.add("hidden");
  }
});

// ── Status filter tabs ─────────────────────────────────────────
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.filter = btn.dataset.filter;
    render();
  });
});

// ── Priority filter buttons ────────────────────────────────────
priorityBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.priorityFilter = btn.dataset.priority;
    render();
  });
});

// ── Clear completed button ────────────────────────────────────
clearBtn.addEventListener("click", () => {
  clearCompleted();
  render();
});

// ── Edit modal ────────────────────────────────────────────────
modalCancel.addEventListener("click", closeEditModal);

modalSave.addEventListener("click", saveEdit);

// Save on Enter key inside edit input
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeEditModal();
});

// Close modal when clicking the backdrop (outside the card)
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

// ── Dark mode toggle button ────────────────────────────────────
themeToggleBtn.addEventListener("click", toggleTheme);

/* ============================================================
   DARK MODE HELPERS
   ============================================================ */

/**
 * Sync the toggle button icons to the current theme.
 * Shows the Sun icon in dark mode (to switch back to light),
 * and the Moon icon in light mode (to switch to dark).
 */
function applyThemeIcons() {
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    iconSun.classList.remove("hidden");
    iconMoon.classList.add("hidden");
  } else {
    iconSun.classList.add("hidden");
    iconMoon.classList.remove("hidden");
  }
}

/**
 * Toggle between light and dark themes.
 * Updates the `dark` class on <html>, persists preference to localStorage,
 * and refreshes the button icons.
 */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  applyThemeIcons();
}

/**
 * Apply the correct button icons on first load
 * (the `dark` class may already be set by the inline script in <head>).
 */
function initTheme() {
  applyThemeIcons();
}

/* ============================================================
   INITIALISE
   ============================================================ */

// Apply correct theme icon state on load
initTheme();

// First render on page load
render();
