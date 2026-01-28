/**
 * TaskQuest - Gamified To-Do List
 * Level up your productivity!
 */
const TaskQuest = (() => {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  const CONFIG = {
    STORAGE_KEY: 'taskquest-data',
    ANIMATION_DURATION: 300,
    XP_PER_LEVEL: 100,
    LEVEL_MULTIPLIER: 1.5,
  };

  // Level titles
  const TITLES = [
    'Novice Tasker',
    'Apprentice Tasker',
    'Task Warrior',
    'Quest Master',
    'Productivity Knight',
    'Task Champion',
    'Legendary Achiever',
    'Grandmaster of Tasks',
    'Mythic Taskslayer',
    'Immortal Completionist'
  ];

  // Achievements
  const ACHIEVEMENTS = {
    firstQuest: { name: 'First Blood', description: 'Complete your first quest', check: (s) => s.totalCompleted >= 1 },
    fiveStreak: { name: 'On Fire', description: 'Reach a 5-day streak', check: (s) => s.streak >= 5 },
    tenQuests: { name: 'Dedicated', description: 'Complete 10 quests', check: (s) => s.totalCompleted >= 10 },
    level5: { name: 'Rising Star', description: 'Reach level 5', check: (s) => s.level >= 5 },
    fiftyQuests: { name: 'Unstoppable', description: 'Complete 50 quests', check: (s) => s.totalCompleted >= 50 },
    level10: { name: 'Task Legend', description: 'Reach level 10', check: (s) => s.level >= 10 },
    hundredXP: { name: 'XP Hunter', description: 'Earn 500 XP total', check: (s) => s.totalXP >= 500 },
  };

  // ============================================
  // State
  // ============================================
  let state = {
    quests: [],
    level: 1,
    currentXP: 0,
    totalXP: 0,
    totalCompleted: 0,
    streak: 0,
    lastCompletionDate: null,
    achievements: [],
    currentView: 'all',
    currentFilter: 'all',
    selectedDifficulty: 10,
    focusIndex: 0,
  };

  // ============================================
  // DOM Elements
  // ============================================
  const elements = {};

  const cacheElements = () => {
    elements.form = document.getElementById('quest-form');
    elements.input = document.getElementById('quest-input');
    elements.questList = document.getElementById('quest-list');
    elements.emptyState = document.getElementById('empty-state');
    elements.focusView = document.getElementById('focus-view');
    elements.focusQuest = document.getElementById('focus-quest');
    elements.clearCompleted = document.getElementById('clear-completed');

    // Player stats
    elements.playerLevel = document.getElementById('player-level');
    elements.playerTitle = document.getElementById('player-title');
    elements.currentXP = document.getElementById('current-xp');
    elements.nextLevelXP = document.getElementById('next-level-xp');
    elements.xpFill = document.getElementById('xp-fill');
    elements.streakCount = document.getElementById('streak-count');

    // Counts
    elements.countAll = document.getElementById('count-all');
    elements.countActive = document.getElementById('count-active');
    elements.countCompleted = document.getElementById('count-completed');
    elements.totalCompleted = document.getElementById('total-completed');
    elements.totalXPEarned = document.getElementById('total-xp-earned');

    // UI elements
    elements.filterTabs = document.querySelectorAll('.filter-tab');
    elements.viewBtns = document.querySelectorAll('.view-btn');
    elements.diffBtns = document.querySelectorAll('.diff-btn');
    elements.skipQuest = document.getElementById('skip-quest');
    elements.completeFocus = document.getElementById('complete-focus');

    // Modals & Toasts
    elements.levelUpModal = document.getElementById('level-up-modal');
    elements.closeLevelUp = document.getElementById('close-level-up');
    elements.newLevel = document.getElementById('new-level');
    elements.newRank = document.getElementById('new-rank');
    elements.achievementToast = document.getElementById('achievement-toast');
    elements.achievementName = document.getElementById('achievement-name');
    elements.xpPopup = document.getElementById('xp-popup');
    elements.xpAmount = document.getElementById('xp-amount');

    // Confetti
    elements.confettiCanvas = document.getElementById('confetti-canvas');
  };

  // ============================================
  // Utilities
  // ============================================
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const generateId = () => `quest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const getXPForLevel = (level) => Math.floor(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.LEVEL_MULTIPLIER, level - 1));

  const getTitleForLevel = (level) => TITLES[Math.min(level - 1, TITLES.length - 1)];

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  };

  const isYesterday = (date) => {
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
  };

  // ============================================
  // Storage
  // ============================================
  const loadState = () => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        state = { ...state, ...parsed };
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
  };

  const saveState = () => {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  // ============================================
  // Confetti System
  // ============================================
  const confetti = {
    particles: [],
    ctx: null,
    running: false,

    init() {
      const canvas = elements.confettiCanvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.ctx = canvas.getContext('2d');

      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    },

    createParticle(x, y) {
      const colors = ['#ffd700', '#00ff88', '#a855f7', '#3b82f6', '#ef4444', '#f97316'];
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 15,
        vy: Math.random() * -15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.3,
        friction: 0.99,
        opacity: 1,
      };
    },

    burst(x, y, count = 50) {
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle(x, y));
      }
      if (!this.running) {
        this.running = true;
        this.animate();
      }
    },

    celebrate() {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.burst(centerX, centerY, 100);
      setTimeout(() => this.burst(centerX - 150, centerY, 50), 100);
      setTimeout(() => this.burst(centerX + 150, centerY, 50), 200);
    },

    animate() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      this.particles = this.particles.filter(p => {
        p.vy += p.gravity;
        p.vx *= p.friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.01;

        if (p.opacity <= 0 || p.y > window.innerHeight) return false;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.ctx.restore();

        return true;
      });

      if (this.particles.length > 0) {
        requestAnimationFrame(() => this.animate());
      } else {
        this.running = false;
      }
    }
  };

  // ============================================
  // XP & Leveling
  // ============================================
  const awardXP = (amount) => {
    const xpNeeded = getXPForLevel(state.level);
    state.currentXP += amount;
    state.totalXP += amount;

    // Show XP popup
    showXPPopup(amount);

    // Check for level up
    while (state.currentXP >= xpNeeded) {
      state.currentXP -= xpNeeded;
      state.level++;
      showLevelUp();
    }

    updatePlayerStats();
    checkAchievements();
    saveState();
  };

  const showXPPopup = (amount) => {
    elements.xpAmount.textContent = amount;
    elements.xpPopup.classList.remove('d-none');
    elements.xpPopup.classList.add('show');

    setTimeout(() => {
      elements.xpPopup.classList.remove('show');
      setTimeout(() => elements.xpPopup.classList.add('d-none'), 300);
    }, 1000);
  };

  const showLevelUp = () => {
    elements.newLevel.textContent = state.level;
    elements.newRank.textContent = getTitleForLevel(state.level);
    elements.levelUpModal.classList.remove('d-none');
    confetti.celebrate();
  };

  // ============================================
  // Streak System
  // ============================================
  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastDate = state.lastCompletionDate;

    if (!lastDate) {
      state.streak = 1;
    } else if (isSameDay(lastDate, today)) {
      // Same day, no change
    } else if (isYesterday(lastDate)) {
      state.streak++;
    } else {
      state.streak = 1;
    }

    state.lastCompletionDate = today;
    elements.streakCount.textContent = state.streak;
    checkAchievements();
    saveState();
  };

  // ============================================
  // Achievements
  // ============================================
  const checkAchievements = () => {
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (!state.achievements.includes(key) && achievement.check(state)) {
        state.achievements.push(key);
        showAchievement(achievement.name);
        saveState();
      }
    }
  };

  const showAchievement = (name) => {
    elements.achievementName.textContent = name;
    elements.achievementToast.classList.remove('d-none');
    elements.achievementToast.classList.add('show');

    setTimeout(() => {
      elements.achievementToast.classList.remove('show');
      setTimeout(() => elements.achievementToast.classList.add('d-none'), 400);
    }, 3000);
  };

  // ============================================
  // Quest Management
  // ============================================
  const addQuest = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const quest = {
      id: generateId(),
      text: trimmed,
      xp: state.selectedDifficulty,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    state.quests.unshift(quest);
    saveState();
    renderQuests();

    // Animate new quest
    const newEl = elements.questList.querySelector(`[data-id="${quest.id}"]`);
    if (newEl) newEl.classList.add('quest-enter');
  };

  const toggleQuest = (id) => {
    const quest = state.quests.find(q => q.id === id);
    if (!quest) return;

    const wasCompleted = quest.completed;
    quest.completed = !quest.completed;

    if (quest.completed && !wasCompleted) {
      // Just completed
      state.totalCompleted++;
      awardXP(quest.xp);
      updateStreak();

      // Confetti burst at checkbox location
      const el = elements.questList.querySelector(`[data-id="${id}"]`);
      if (el) {
        const checkbox = el.querySelector('.quest-checkbox');
        const rect = checkbox.getBoundingClientRect();
        confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
        el.classList.add('quest-complete');
      }
    } else if (!quest.completed && wasCompleted) {
      // Uncompleted
      state.totalCompleted = Math.max(0, state.totalCompleted - 1);
    }

    saveState();
    renderQuests();
    updateStats();
  };

  const deleteQuest = (id) => {
    const el = elements.questList.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('quest-exit');
      setTimeout(() => {
        state.quests = state.quests.filter(q => q.id !== id);
        saveState();
        renderQuests();
      }, CONFIG.ANIMATION_DURATION);
    } else {
      state.quests = state.quests.filter(q => q.id !== id);
      saveState();
      renderQuests();
    }
  };

  const clearCompleted = () => {
    const completedEls = elements.questList.querySelectorAll('.quest-item.completed');
    completedEls.forEach(el => el.classList.add('quest-exit'));

    setTimeout(() => {
      state.quests = state.quests.filter(q => !q.completed);
      saveState();
      renderQuests();
    }, CONFIG.ANIMATION_DURATION);
  };

  // ============================================
  // Filtering & Views
  // ============================================
  const getFilteredQuests = () => {
    switch (state.currentFilter) {
      case 'active':
        return state.quests.filter(q => !q.completed);
      case 'completed':
        return state.quests.filter(q => q.completed);
      default:
        return state.quests;
    }
  };

  const setFilter = (filter) => {
    state.currentFilter = filter;
    elements.filterTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    renderQuests();
  };

  const setView = (view) => {
    state.currentView = view;
    elements.viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'focus') {
      elements.questList.classList.add('d-none');
      elements.focusView.classList.remove('d-none');
      state.focusIndex = 0;
      renderFocusQuest();
    } else {
      elements.questList.classList.remove('d-none');
      elements.focusView.classList.add('d-none');
      renderQuests();
    }
  };

  // ============================================
  // Rendering
  // ============================================
  const createQuestHTML = (quest) => {
    const escaped = escapeHtml(quest.text);
    const completedClass = quest.completed ? 'completed' : '';
    const checkedAttr = quest.completed ? 'checked' : '';
    const difficultyClass = quest.xp === 50 ? 'diff-hard' : quest.xp === 25 ? 'diff-medium' : 'diff-easy';

    return `
      <li class="quest-item ${completedClass} ${difficultyClass}" data-id="${quest.id}">
        <input type="checkbox"
               class="quest-checkbox"
               ${checkedAttr}
               aria-label="Mark quest as ${quest.completed ? 'incomplete' : 'complete'}">
        <div class="quest-content">
          <span class="quest-text">${escaped}</span>
          <span class="quest-xp">+${quest.xp} XP</span>
        </div>
        <button type="button" class="delete-btn" aria-label="Delete quest">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </li>
    `;
  };

  const renderQuests = () => {
    const filtered = getFilteredQuests();
    elements.questList.innerHTML = filtered.map(createQuestHTML).join('');

    // Toggle empty state
    const hasQuests = filtered.length > 0;
    elements.emptyState.classList.toggle('d-none', hasQuests);
    elements.questList.classList.toggle('d-none', !hasQuests && state.currentView !== 'focus');

    // Update counts
    updateCounts();
    updateStats();
  };

  const renderFocusQuest = () => {
    const activeQuests = state.quests.filter(q => !q.completed);

    if (activeQuests.length === 0) {
      elements.focusQuest.innerHTML = `
        <div class="quest-text">All quests completed!</div>
        <div class="quest-xp">Great job, adventurer!</div>
      `;
      elements.completeFocus.disabled = true;
      elements.skipQuest.disabled = true;
      return;
    }

    // Wrap focus index
    state.focusIndex = state.focusIndex % activeQuests.length;
    const quest = activeQuests[state.focusIndex];

    elements.focusQuest.innerHTML = `
      <span class="quest-text">${escapeHtml(quest.text)}</span>
      <span class="quest-xp">+${quest.xp} XP on completion</span>
    `;
    elements.focusQuest.dataset.id = quest.id;
    elements.completeFocus.disabled = false;
    elements.skipQuest.disabled = activeQuests.length <= 1;
  };

  const updateCounts = () => {
    const all = state.quests.length;
    const active = state.quests.filter(q => !q.completed).length;
    const completed = state.quests.filter(q => q.completed).length;

    elements.countAll.textContent = all;
    elements.countActive.textContent = active;
    elements.countCompleted.textContent = completed;

    // Show/hide clear button
    elements.clearCompleted.classList.toggle('d-none', completed === 0);
  };

  const updateStats = () => {
    elements.totalCompleted.textContent = state.totalCompleted;
    elements.totalXPEarned.textContent = state.totalXP;
  };

  const updatePlayerStats = () => {
    const xpNeeded = getXPForLevel(state.level);
    const progress = (state.currentXP / xpNeeded) * 100;

    elements.playerLevel.textContent = state.level;
    elements.playerTitle.textContent = getTitleForLevel(state.level);
    elements.currentXP.textContent = state.currentXP;
    elements.nextLevelXP.textContent = xpNeeded;
    elements.xpFill.style.width = `${progress}%`;
    elements.streakCount.textContent = state.streak;
  };

  // ============================================
  // Event Handlers
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    addQuest(elements.input.value);
    elements.input.value = '';
    elements.input.focus();
  };

  const handleQuestListClick = (e) => {
    const item = e.target.closest('.quest-item');
    if (!item) return;

    const id = item.dataset.id;

    if (e.target.closest('.delete-btn')) {
      deleteQuest(id);
    } else if (e.target.closest('.quest-checkbox')) {
      toggleQuest(id);
    }
  };

  const handleFilterClick = (e) => {
    const tab = e.target.closest('.filter-tab');
    if (tab) setFilter(tab.dataset.filter);
  };

  const handleViewClick = (e) => {
    const btn = e.target.closest('.view-btn');
    if (btn) setView(btn.dataset.view);
  };

  const handleDifficultyClick = (e) => {
    const btn = e.target.closest('.diff-btn');
    if (!btn) return;

    elements.diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedDifficulty = parseInt(btn.dataset.xp, 10);
  };

  const handleSkipQuest = () => {
    const activeQuests = state.quests.filter(q => !q.completed);
    if (activeQuests.length > 1) {
      state.focusIndex = (state.focusIndex + 1) % activeQuests.length;
      renderFocusQuest();
    }
  };

  const handleCompleteFocus = () => {
    const id = elements.focusQuest.dataset.id;
    if (id) {
      toggleQuest(id);
      renderFocusQuest();
    }
  };

  // ============================================
  // Initialization
  // ============================================
  const bindEvents = () => {
    elements.form.addEventListener('submit', handleSubmit);
    elements.questList.addEventListener('click', handleQuestListClick);
    elements.clearCompleted.addEventListener('click', clearCompleted);

    // Filter tabs
    document.querySelector('.quest-filters').addEventListener('click', handleFilterClick);

    // View toggles
    document.querySelector('.view-toggles').addEventListener('click', handleViewClick);

    // Difficulty selector
    document.querySelector('.difficulty-selector').addEventListener('click', handleDifficultyClick);

    // Focus mode controls
    elements.skipQuest.addEventListener('click', handleSkipQuest);
    elements.completeFocus.addEventListener('click', handleCompleteFocus);

    // Level up modal close
    elements.closeLevelUp.addEventListener('click', () => {
      elements.levelUpModal.classList.add('d-none');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== elements.input) {
        e.preventDefault();
        elements.input.focus();
      }
      if (e.key === 'Escape') {
        elements.levelUpModal.classList.add('d-none');
      }
    });
  };

  const init = () => {
    cacheElements();
    loadState();
    confetti.init();
    bindEvents();

    // Check if streak should reset (missed a day)
    if (state.lastCompletionDate && !isSameDay(state.lastCompletionDate, new Date()) && !isYesterday(state.lastCompletionDate)) {
      state.streak = 0;
      saveState();
    }

    updatePlayerStats();
    renderQuests();

    console.log(`TaskQuest initialized - Level ${state.level} ${getTitleForLevel(state.level)}`);
  };

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    getState: () => ({ ...state }),
    getLevel: () => state.level,
    getStreak: () => state.streak,
  };
})();
