/**
 * TaskManager - Modern To-Do List Application
 *
 * Features:
 * - localStorage persistence
 * - Event delegation for performance
 * - XSS protection
 * - Filter functionality (All/Active/Completed)
 * - Keyboard accessibility
 *
 * @module TaskManager
 */
const TaskManager = (() => {
  'use strict';

  // Configuration
  const CONFIG = {
    STORAGE_KEY: 'todo-tasks',
    ANIMATION_DURATION: 300,
  };

  // State
  let tasks = [];
  let currentFilter = 'all';

  // DOM Elements (cached for performance)
  const elements = {
    form: null,
    input: null,
    taskList: null,
    taskCount: null,
    clearCompleted: null,
    filterButtons: null,
    emptyState: null,
  };

  /**
   * Escapes HTML to prevent XSS attacks
   * @param {string} text - The text to escape
   * @returns {string} Escaped HTML string
   */
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  /**
   * Generates a unique ID for tasks
   * @returns {string} Unique identifier
   */
  const generateId = () => {
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  /**
   * Loads tasks from localStorage
   * @returns {Array} Array of task objects
   */
  const loadTasks = () => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return [];
    }
  };

  /**
   * Saves tasks to localStorage
   */
  const saveTasks = () => {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  };

  /**
   * Filters tasks based on current filter setting
   * @returns {Array} Filtered array of tasks
   */
  const getFilteredTasks = () => {
    switch (currentFilter) {
      case 'active':
        return tasks.filter((task) => !task.completed);
      case 'completed':
        return tasks.filter((task) => task.completed);
      default:
        return tasks;
    }
  };

  /**
   * Creates HTML for a single task item
   * @param {Object} task - Task object
   * @returns {string} HTML string for the task
   */
  const createTaskHtml = (task) => {
    const escapedText = escapeHtml(task.text);
    const completedClass = task.completed ? 'completed' : '';
    const checkedAttr = task.completed ? 'checked' : '';

    return `
      <li class="task-item ${completedClass}" data-id="${task.id}">
        <input type="checkbox"
               class="task-checkbox"
               ${checkedAttr}
               aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
        <span class="task-text">${escapedText}</span>
        <button type="button"
                class="delete-btn"
                aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </li>
    `;
  };

  /**
   * Renders the task list to the DOM
   */
  const renderTasks = () => {
    const filteredTasks = getFilteredTasks();

    // Update task list
    elements.taskList.innerHTML = filteredTasks.map(createTaskHtml).join('');

    // Update task count
    const activeCount = tasks.filter((task) => !task.completed).length;
    const taskText = activeCount === 1 ? 'task' : 'tasks';
    elements.taskCount.textContent = `${activeCount} ${taskText} remaining`;

    // Toggle empty state and task list visibility
    const hasVisibleTasks = filteredTasks.length > 0;
    elements.emptyState.classList.toggle('d-none', hasVisibleTasks);
    elements.taskList.classList.toggle('d-none', !hasVisibleTasks);

    // Update clear completed button visibility
    const hasCompleted = tasks.some((task) => task.completed);
    elements.clearCompleted.classList.toggle('d-none', !hasCompleted);
  };

  /**
   * Adds a new task
   * @param {string} text - Task text
   */
  const addTask = (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const newTask = {
      id: generateId(),
      text: trimmedText,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();

    // Animate the new task
    const newElement = elements.taskList.querySelector(`[data-id="${newTask.id}"]`);
    if (newElement) {
      newElement.classList.add('task-enter');
      requestAnimationFrame(() => {
        newElement.classList.remove('task-enter');
      });
    }
  };

  /**
   * Toggles task completion status
   * @param {string} id - Task ID
   */
  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      saveTasks();
      renderTasks();
    }
  };

  /**
   * Deletes a task with animation
   * @param {string} id - Task ID
   */
  const deleteTask = (id) => {
    const element = elements.taskList.querySelector(`[data-id="${id}"]`);

    if (element) {
      element.classList.add('task-exit');
      setTimeout(() => {
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks();
        renderTasks();
      }, CONFIG.ANIMATION_DURATION);
    } else {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      renderTasks();
    }
  };

  /**
   * Clears all completed tasks
   */
  const clearCompleted = () => {
    const completedElements = elements.taskList.querySelectorAll('.task-item.completed');

    completedElements.forEach((el) => el.classList.add('task-exit'));

    setTimeout(() => {
      tasks = tasks.filter((task) => !task.completed);
      saveTasks();
      renderTasks();
    }, CONFIG.ANIMATION_DURATION);
  };

  /**
   * Sets the current filter
   * @param {string} filter - Filter type ('all', 'active', 'completed')
   */
  const setFilter = (filter) => {
    currentFilter = filter;

    // Update button states
    elements.filterButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderTasks();
  };

  /**
   * Handles form submission
   * @param {Event} event - Submit event
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    addTask(elements.input.value);
    elements.input.value = '';
    elements.input.focus();
  };

  /**
   * Handles clicks on the task list (event delegation)
   * @param {Event} event - Click event
   */
  const handleTaskListClick = (event) => {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.id;

    if (event.target.closest('.delete-btn')) {
      deleteTask(taskId);
    } else if (event.target.closest('.task-checkbox')) {
      toggleTask(taskId);
    }
  };

  /**
   * Handles filter button clicks
   * @param {Event} event - Click event
   */
  const handleFilterClick = (event) => {
    const filterBtn = event.target.closest('.filter-btn');
    if (filterBtn) {
      setFilter(filterBtn.dataset.filter);
    }
  };

  /**
   * Caches DOM element references
   */
  const cacheElements = () => {
    elements.form = document.getElementById('task-form');
    elements.input = document.getElementById('task-input-field');
    elements.taskList = document.getElementById('task-list');
    elements.taskCount = document.getElementById('task-count');
    elements.clearCompleted = document.getElementById('clear-completed');
    elements.filterButtons = document.querySelectorAll('.filter-btn');
    elements.emptyState = document.getElementById('empty-state');
  };

  /**
   * Binds event listeners
   */
  const bindEvents = () => {
    elements.form.addEventListener('submit', handleSubmit);
    elements.taskList.addEventListener('click', handleTaskListClick);
    elements.clearCompleted.addEventListener('click', clearCompleted);

    // Filter buttons - use event delegation
    document.querySelector('.filter-group').addEventListener('click', handleFilterClick);

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Focus input on '/' key
      if (event.key === '/' && document.activeElement !== elements.input) {
        event.preventDefault();
        elements.input.focus();
      }
    });
  };

  /**
   * Initializes the application
   */
  const init = () => {
    cacheElements();
    tasks = loadTasks();
    bindEvents();
    renderTasks();

    // Log initialization for debugging
    console.log(`TaskManager initialized with ${tasks.length} tasks`);
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API (for debugging/testing)
  return {
    getTasks: () => [...tasks],
    getActiveCount: () => tasks.filter((t) => !t.completed).length,
    getCompletedCount: () => tasks.filter((t) => t.completed).length,
  };
})();
