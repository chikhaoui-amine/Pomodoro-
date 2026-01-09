/**
 * ================================================
 * POMODORO TIMER - Application Logic
 * ================================================
 * 
 * A productivity timer using the Pomodoro Technique:
 * - 25 minutes of focused work
 * - 5 minutes of break
 * - Track sessions and streaks
 * 
 * Features:
 * - Customizable durations
 * - Sound notifications
 * - Dark/Light theme
 * - Mobile optimized
 * - LocalStorage persistence
 */

// ================================================
// POMODORO TIMER CLASS
// ================================================

class PomodoroTimer {
    constructor() {
        // -------- State --------
        this.workDuration = 25 * 60;      // Work time in seconds
        this.breakDuration = 5 * 60;       // Break time in seconds
        this.timeRemaining = this.workDuration;
        this.totalTime = this.workDuration;
        this.isRunning = false;
        this.isWorkMode = true;
        this.timerInterval = null;
        
        // -------- Stats --------
        this.sessionCount = 0;
        this.todayFocusMinutes = 0;
        this.currentStreak = 0;
        this.dailyGoal = 8;
        
        // -------- Settings --------
        this.soundEnabled = true;
        this.audioContext = null;
        
        // -------- DOM Elements --------
        this.elements = {
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds'),
            progressRing: document.getElementById('progressRing'),
            startPauseBtn: document.getElementById('startPauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            skipBtn: document.getElementById('skipBtn'),
            statusText: document.getElementById('statusText'),
            sessionCount: document.getElementById('sessionCount'),
            todayFocus: document.getElementById('todayFocus'),
            currentStreak: document.getElementById('currentStreak'),
            workDuration: document.getElementById('workDuration'),
            breakDuration: document.getElementById('breakDuration'),
            applySettings: document.getElementById('applySettings'),
            modeTabs: document.querySelectorAll('.mode-tab'),
            timerCard: document.querySelector('.timer-card'),
            modeLabel: document.getElementById('modeLabel'),
            soundToggle: document.getElementById('soundToggle'),
            dailyProgress: document.getElementById('dailyProgress'),
            statusBadge: document.getElementById('statusBadge')
        };
        
        // Progress ring setup (circumference = 2πr where r=90)
        this.circumference = 2 * Math.PI * 90;
        this.elements.progressRing.style.strokeDasharray = this.circumference;
        
        // -------- Initialize --------
        this.loadData();
        this.bindEvents();
        this.updateUI();
        this.setupMobileOptimizations();
    }

    // ================================================
    // EVENT BINDING
    // ================================================
    
    bindEvents() {
        const { startPauseBtn, resetBtn, skipBtn, applySettings, modeTabs, soundToggle } = this.elements;
        
        // Main controls
        startPauseBtn.addEventListener('click', () => this.toggle());
        resetBtn.addEventListener('click', () => this.reset());
        skipBtn.addEventListener('click', () => this.skip());
        applySettings.addEventListener('click', () => this.applySettings());
        soundToggle.addEventListener('click', () => this.toggleSound());
        
        // Mode tabs
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchMode(tab.dataset.mode === 'work');
            });
        });
        
        // Initialize audio on first interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    // ================================================
    // TIMER CONTROLS
    // ================================================
    
    toggle() {
        this.isRunning ? this.pause() : this.start();
    }
    
    start() {
        this.isRunning = true;
        this.elements.timerCard.classList.add('running');
        this.updateButtonState();
        this.updateStatusText(this.isWorkMode ? '🎯 Focus time!' : '☕ Take a break!');
        this.updateBadge();
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            
            if (this.timeRemaining <= 0) {
                this.complete();
            } else {
                this.updateDisplay();
                this.updateProgressRing();
            }
        }, 1000);
    }
    
    pause() {
        this.isRunning = false;
        this.elements.timerCard.classList.remove('running');
        this.updateButtonState();
        this.updateStatusText('⏸️ Paused');
        this.updateBadge();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    reset() {
        this.pause();
        this.timeRemaining = this.isWorkMode ? this.workDuration : this.breakDuration;
        this.totalTime = this.timeRemaining;
        this.updateDisplay();
        this.updateProgressRing();
        this.updateStatusText('Ready to focus?');
    }
    
    skip() {
        this.pause();
        this.switchMode(!this.isWorkMode);
    }
    
    switchMode(toWorkMode) {
        this.isWorkMode = toWorkMode;
        this.timeRemaining = toWorkMode ? this.workDuration : this.breakDuration;
        this.totalTime = this.timeRemaining;
        
        // Update body class for theme colors
        document.body.classList.toggle('break-mode', !toWorkMode);
        
        // Update active tab
        this.elements.modeTabs.forEach(tab => {
            const isActive = (tab.dataset.mode === 'work') === toWorkMode;
            tab.classList.toggle('active', isActive);
        });
        
        // Update mode label
        this.elements.modeLabel.textContent = toWorkMode ? 'FOCUS' : 'BREAK';
        
        this.updateDisplay();
        this.updateProgressRing();
        this.updateStatusText(toWorkMode ? 'Ready to focus?' : 'Time for a break!');
        this.updateBadge();
    }
    
    complete() {
        this.pause();
        
        if (this.soundEnabled) {
            this.playSound();
        }
        
        if (this.isWorkMode) {
            // Work session completed - update stats
            this.sessionCount++;
            this.todayFocusMinutes += Math.round(this.workDuration / 60);
            this.currentStreak++;
            this.updateStats();
            this.saveData();
            this.showToast('🎉 Great work! Time for a break!', 'work');
        } else {
            this.showToast('💪 Break over! Ready to focus?', 'break');
        }
        
        // Auto-switch mode after delay
        setTimeout(() => this.switchMode(!this.isWorkMode), 1500);
    }

    // ================================================
    // UI UPDATES
    // ================================================
    
    updateUI() {
        this.updateDisplay();
        this.updateProgressRing();
        this.updateStats();
        this.updateBadge();
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        
        this.elements.minutes.textContent = String(minutes).padStart(2, '0');
        this.elements.seconds.textContent = String(seconds).padStart(2, '0');
        
        // Update page title
        const mode = this.isWorkMode ? 'Work' : 'Break';
        document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - ${mode} | Pomodoro`;
    }
    
    updateProgressRing() {
        const progress = this.timeRemaining / this.totalTime;
        const offset = this.circumference * (1 - progress);
        this.elements.progressRing.style.strokeDashoffset = offset;
    }
    
    updateButtonState() {
        const playIcon = this.elements.startPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.startPauseBtn.querySelector('.pause-icon');
        
        playIcon.classList.toggle('hidden', this.isRunning);
        pauseIcon.classList.toggle('hidden', !this.isRunning);
    }
    
    updateStatusText(text) {
        this.elements.statusText.textContent = text;
    }
    
    updateStats() {
        this.elements.sessionCount.textContent = this.sessionCount;
        this.elements.todayFocus.textContent = `${this.todayFocusMinutes} min`;
        this.elements.currentStreak.textContent = this.currentStreak;
        
        // Update daily progress bar
        const progress = Math.min((this.sessionCount / this.dailyGoal) * 100, 100);
        this.elements.dailyProgress.style.width = `${progress}%`;
    }
    
    updateBadge() {
        const badge = this.elements.statusBadge;
        if (!badge) return;
        
        if (this.isRunning) {
            badge.textContent = this.isWorkMode ? 'Deep focus active' : 'Recharging...';
        } else if (this.sessionCount >= this.dailyGoal) {
            badge.textContent = '🎯 Daily goal achieved!';
        } else if (this.sessionCount > 0) {
            const remaining = this.dailyGoal - this.sessionCount;
            badge.textContent = `${remaining} session${remaining > 1 ? 's' : ''} to goal`;
        } else {
            badge.textContent = 'Ready to boost productivity';
        }
    }

    // ================================================
    // SETTINGS
    // ================================================
    
    applySettings() {
        const workMin = parseInt(this.elements.workDuration.value) || 25;
        const breakMin = parseInt(this.elements.breakDuration.value) || 5;
        
        // Validate and set (1-120 for work, 1-60 for break)
        this.workDuration = Math.max(1, Math.min(120, workMin)) * 60;
        this.breakDuration = Math.max(1, Math.min(60, breakMin)) * 60;
        
        // Update inputs with validated values
        this.elements.workDuration.value = Math.round(this.workDuration / 60);
        this.elements.breakDuration.value = Math.round(this.breakDuration / 60);
        
        this.reset();
        this.saveData();
        this.showToast('✅ Settings applied!', this.isWorkMode ? 'work' : 'break');
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        const soundOn = this.elements.soundToggle.querySelector('.sound-on');
        const soundOff = this.elements.soundToggle.querySelector('.sound-off');
        
        soundOn.classList.toggle('hidden', !this.soundEnabled);
        soundOff.classList.toggle('hidden', this.soundEnabled);
        
        localStorage.setItem('pomodoroSound', this.soundEnabled);
    }

    // ================================================
    // AUDIO
    // ================================================
    
    playSound() {
        // Vibrate on mobile
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume if suspended (mobile browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Play two-tone notification
        this.playTone(830, 0.8);
        setTimeout(() => this.playTone(1046, 1), 200);
    }
    
    playTone(frequency, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // ================================================
    // NOTIFICATIONS
    // ================================================
    
    showToast(message, type) {
        // Remove existing toast
        document.querySelector('.toast')?.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ================================================
    // DATA PERSISTENCE
    // ================================================
    
    saveData() {
        const data = {
            workDuration: this.workDuration,
            breakDuration: this.breakDuration,
            sessionCount: this.sessionCount,
            todayFocusMinutes: this.todayFocusMinutes,
            currentStreak: this.currentStreak,
            lastDate: new Date().toDateString()
        };
        localStorage.setItem('pomodoroData', JSON.stringify(data));
    }
    
    loadData() {
        // Load timer data
        const saved = localStorage.getItem('pomodoroData');
        if (saved) {
            const data = JSON.parse(saved);
            
            this.workDuration = data.workDuration || 25 * 60;
            this.breakDuration = data.breakDuration || 5 * 60;
            
            // Reset daily stats if new day
            const isToday = data.lastDate === new Date().toDateString();
            this.sessionCount = isToday ? (data.sessionCount || 0) : 0;
            this.todayFocusMinutes = isToday ? (data.todayFocusMinutes || 0) : 0;
            this.currentStreak = isToday ? (data.currentStreak || 0) : 0;
            
            // Update inputs
            this.elements.workDuration.value = Math.round(this.workDuration / 60);
            this.elements.breakDuration.value = Math.round(this.breakDuration / 60);
            
            // Set initial time
            this.timeRemaining = this.workDuration;
            this.totalTime = this.workDuration;
        }
        
        // Load sound preference
        const soundPref = localStorage.getItem('pomodoroSound');
        if (soundPref === 'false') {
            this.soundEnabled = false;
            this.elements.soundToggle.querySelector('.sound-on').classList.add('hidden');
            this.elements.soundToggle.querySelector('.sound-off').classList.remove('hidden');
        }
    }

    // ================================================
    // MOBILE OPTIMIZATIONS
    // ================================================
    
    setupMobileOptimizations() {
        // Handle visibility change (app going to background)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.backgroundTime = Date.now();
            } else if (!document.hidden && this.backgroundTime && this.isRunning) {
                // Adjust timer for time spent in background
                const elapsed = Math.floor((Date.now() - this.backgroundTime) / 1000);
                this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
                this.backgroundTime = null;
                
                if (this.timeRemaining <= 0) {
                    this.complete();
                } else {
                    this.updateDisplay();
                    this.updateProgressRing();
                }
            }
        });
        
        // Prevent double-tap zoom
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) e.preventDefault();
            lastTap = now;
        }, { passive: false });
    }
}

// ================================================
// THEME MANAGER CLASS
// ================================================

class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('themeToggle');
        this.loadTheme();
        this.bindEvents();
    }
    
    bindEvents() {
        this.toggle.addEventListener('click', () => this.toggleTheme());
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
            if (!localStorage.getItem('pomodoroTheme')) {
                this.setTheme(e.matches ? 'light' : 'dark');
            }
        });
    }
    
    loadTheme() {
        const saved = localStorage.getItem('pomodoroTheme');
        if (saved) {
            this.setTheme(saved);
        } else {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }
    }
    
    toggleTheme() {
        const isLight = document.body.classList.contains('light-mode');
        const newTheme = isLight ? 'dark' : 'light';
        this.setTheme(newTheme);
        localStorage.setItem('pomodoroTheme', newTheme);
    }
    
    setTheme(theme) {
        document.body.classList.toggle('light-mode', theme === 'light');
    }
}

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
    new ThemeManager();
});
