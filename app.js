const POWER_THRESHOLDS = { NOVICE: 0, INTERMEDIATE: 200, ADVANCED: 400, ELITE: 500 };

const AetherCalculator = {
    sectors(state = {}) {
        return Array.isArray(state.sectors)
            ? state.sectors
            : Array.isArray(state.matrix)
                ? state.matrix
                : [];
    },

    currentDayIndex(date = new Date()) {
        return Math.max(0, Math.min(29, date.getDate() - 1));
    },

    activeSectorStats(state = {}, date = new Date()) {
        const sectors = AetherCalculator.sectors(state);
        const currentDayIndex = AetherCalculator.currentDayIndex(date);
        const activeSectors = sectors.filter(sector => {
            const value = sector.days?.[currentDayIndex];
            return value === 1;
        }).length;
        return {
            activeSectors,
            totalSectors: sectors.length,
            currentDayIndex
        };
    },

    tdee(bio = {}) {
        const weight = Number(bio.weight || 0);
        const height = Number(bio.height || 0);
        const age = Number(bio.age || 0);
        const genderOffset = bio.gender === 'female' ? -161 : 5;
        const archetypeMultiplier = {
            ectomorph: 1.15,
            mesomorph: 1.05,
            endomorph: 0.95
        }[bio.bodyType] || 1.05;
        return ((10 * weight) + (6.25 * height) - (5 * age) + genderOffset) * archetypeMultiplier;
    },

    nutritionTotals(intakeLog = []) {
        return intakeLog.reduce((acc, item) => {
            acc.protein += Number(item.p || 0);
            acc.carbs += Number(item.c || 0);
            acc.fat += Number(item.f || 0);
            acc.kcal += AetherCalculator.foodCalories(item);
            return acc;
        }, { protein: 0, carbs: 0, fat: 0, kcal: 0 });
    },

    foodCalories(item = {}) {
        return (Number(item.p || 0) * 4) + (Number(item.c || 0) * 4) + (Number(item.f || 0) * 9);
    },

    macroBreakdown(totals = { protein: 0, carbs: 0, fat: 0, kcal: 0 }) {
        const proteinKcal = totals.protein * 4;
        const carbsKcal = totals.carbs * 4;
        const fatsKcal = totals.fat * 9;
        const totalMacroKcal = Math.max(1, proteinKcal + carbsKcal + fatsKcal);
        return {
            proteinKcal,
            carbsKcal,
            fatsKcal,
            proteinPct: (proteinKcal / totalMacroKcal) * 100,
            carbsPct: (carbsKcal / totalMacroKcal) * 100,
            fatsPct: (fatsKcal / totalMacroKcal) * 100
        };
    },

    oneRM(entry = {}) {
        const reps = Math.min(Number(entry.reps || 0), 36);
        const denominator = 1.0278 - (0.0278 * reps);
        if (!entry.weight || denominator <= 0) return 0;
        return Number(entry.weight) / denominator;
    },

    powerStats(gymLog = [], selectedDate = new Date()) {
        const oneRMs = gymLog.map(entry => AetherCalculator.oneRM(entry));
        const max = Math.max(0, ...oneRMs);
        const total = oneRMs.reduce((sum, value) => sum + value, 0);
        const todayISO = selectedDate.toISOString().split('T')[0];
        const todayPower = gymLog
            .filter(log => log.date?.split('T')[0] === todayISO)
            .reduce((sum, entry) => sum + AetherCalculator.oneRM(entry), 0);
        const tier = total >= POWER_THRESHOLDS.ELITE
            ? 'Elite'
            : total >= POWER_THRESHOLDS.ADVANCED
                ? 'Advanced'
                : total >= POWER_THRESHOLDS.INTERMEDIATE
                    ? 'Intermediate'
                    : total > POWER_THRESHOLDS.NOVICE
                        ? 'Novice'
                        : 'Dormant';
        return {
            max,
            total,
            todayPower,
            percent: Math.min(100, Math.round((total / POWER_THRESHOLDS.ELITE) * 100)),
            tier
        };
    },

    potentialBreakdown(state = {}, selectedDate = new Date()) {
        const sectors = AetherCalculator.sectors(state);
        const sectorStats = AetherCalculator.activeSectorStats(state, selectedDate);
        const calibrated = sectorStats.activeSectors;
        const totalCells = Math.max(1, sectors.reduce((sum, sector) => sum + (sector.days?.length || 0), 0));
        const completedCells = sectors.reduce((sum, sector) => sum + (sector.days || []).filter(day => day === 1).length, 0);
        const matrixCompletion = (completedCells / totalCells) * 100;
        const todayCompletion = sectorStats.totalSectors ? (sectorStats.activeSectors / sectorStats.totalSectors) * 100 : 0;
        const ascensionSignal = Math.min(100, (state.goodHabits || []).reduce((sum, habit) => sum + Number(habit.streak || 0), 0) * 2);
        const decayPenalty = Math.min(45, (state.badHabits || []).reduce((sum, habit) => sum + Number(habit.streak || 0), 0) * 5);
        const habits = Math.max(0, Math.min(100, (todayCompletion * 0.62) + (matrixCompletion * 0.2) + (ascensionSignal * 0.18) - decayPenalty));

        const tdee = AetherCalculator.tdee(state.bio || {});
        const nutritionTotals = AetherCalculator.nutritionTotals(state.intakeLog || []);
        const macro = AetherCalculator.macroBreakdown(nutritionTotals);
        const calorieScore = tdee > 0 ? Math.max(0, 100 - (Math.abs(nutritionTotals.kcal - tdee) / tdee) * 100) : 0;
        const macroScore = nutritionTotals.kcal > 0
            ? Math.max(0, 100 - Math.abs(25 - macro.proteinPct) * 1.8 - Math.abs(45 - macro.carbsPct) * 0.7 - Math.abs(30 - macro.fatsPct) * 0.8)
            : 0;
        const nutrition = (calorieScore * 0.72) + (macroScore * 0.28);
        const power = AetherCalculator.powerStats(state.gymLog || [], selectedDate).percent;
        const total = Math.round((habits * 0.4) + (nutrition * 0.3) + (power * 0.3));

        return {
            habits: Math.round(habits),
            nutrition: Math.round(nutrition),
            power,
            total: Math.max(0, Math.min(100, total)),
            calibrated,
            sectors: sectorStats.totalSectors,
            currentDayIndex: sectorStats.currentDayIndex,
            matrixCompletion: Math.round(matrixCompletion),
            todayCompletion: Math.round(todayCompletion),
            decayPenalty
        };
    }
};

/**
 * AETHER: Reactive Command Center
 * Global state key: localStorage('aether_state')
 */

class AetherSystem {
    constructor() {
        this.storageKey = 'aether_state';
        this.currentPage = this.detectPage();
        this.currentDate = new Date();
        this.proxyCache = new WeakMap();
        this.isCommitting = false;
        this.mainChart = null;
        this.instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        this.syncChannel = 'BroadcastChannel' in window ? new BroadcastChannel('aether_sync_channel') : null;

        this.state = this.createReactiveState(this.loadState());
        this.init();
    }

    defaultState() {
        return {
            matrix: [
                { id: 1, name: 'Deep Work', color: 'violet-neon', days: Array(30).fill(0) },
                { id: 2, name: 'Creative Flow', color: 'cyan-neon', days: Array(30).fill(0) },
                { id: 3, name: 'Hydration', color: 'cyan-neon', days: Array(30).fill(0) }
            ],
            sectors: null,
            goodHabits: [{ name: 'Morning Focus', streak: 12 }],
            badHabits: [],
            bio: {
                bodyType: 'mesomorph',
                gender: 'male',
                weight: 80,
                height: 180,
                age: 25,
                activity: 1.55,
                hydration: 1200,
                intakeLog: []
            },
            intakeLog: [],
            gymLog: [],
            feed: [
                { at: new Date().toISOString(), message: 'Aether command center online.', effect: 'Reactive sync engaged' }
            ],
            lastUpdate: new Date().toISOString()
        };
    }

    mergeState(defaults, stored) {
        const merged = { ...defaults, ...(stored || {}) };
        merged.bio = { ...defaults.bio, ...(stored?.bio || {}) };
        merged.intakeLog = Array.isArray(stored?.intakeLog)
            ? stored.intakeLog
            : Array.isArray(stored?.bio?.intakeLog)
                ? stored.bio.intakeLog
                : defaults.intakeLog;
        const sourceSectors = Array.isArray(stored?.sectors)
            ? stored.sectors
            : Array.isArray(merged.matrix)
                ? merged.matrix
                : defaults.matrix;
        merged.matrix = sourceSectors;
        merged.matrix = merged.matrix.map((sector, index) => ({
            id: sector.id || Date.now() + index,
            name: sector.name || `Sector ${index + 1}`,
            color: sector.color || defaults.matrix[index]?.color || 'cyan-neon',
            days: this.normalizeMatrixDays(sector.days)
        }));
        merged.sectors = merged.matrix;
        merged.goodHabits = Array.isArray(merged.goodHabits) ? merged.goodHabits : defaults.goodHabits;
        merged.badHabits = Array.isArray(merged.badHabits) ? merged.badHabits : defaults.badHabits;
        merged.bio.intakeLog = merged.intakeLog;
        merged.gymLog = Array.isArray(merged.gymLog) ? merged.gymLog : [];
        merged.feed = Array.isArray(merged.feed) ? merged.feed.slice(0, 24) : defaults.feed;
        return merged;
    }

    loadState() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.storageKey));
            return this.mergeState(this.defaultState(), stored);
        } catch (error) {
            console.error('Aether: state load failed', error);
            return this.defaultState();
        }
    }

    normalizeMatrixDays(days = []) {
        const normalized = Array(30).fill(0);
        if (Array.isArray(days)) {
            days.slice(0, 30).forEach((value, index) => {
                normalized[index] = value === 1 || value === true ? 1 : 0;
            });
        }
        return normalized;
    }

    createReactiveState(target) {
        if (!target || typeof target !== 'object') return target;
        if (this.proxyCache.has(target)) return this.proxyCache.get(target);

        const proxy = new Proxy(target, {
            get: (obj, prop) => this.createReactiveState(obj[prop]),
            set: (obj, prop, value) => {
                obj[prop] = this.createReactiveState(value);
                if (!this.isCommitting && prop !== 'lastUpdate') {
                    this.persist('[SYSTEM]: State mutation detected', 'Global refresh');
                }
                return true;
            },
            deleteProperty: (obj, prop) => {
                delete obj[prop];
                if (!this.isCommitting) this.persist('[SYSTEM]: State entry removed', 'Global refresh');
                return true;
            }
        });

        this.proxyCache.set(target, proxy);
        return proxy;
    }

    detectPage() {
        const path = window.location.href.toLowerCase();
        if (path.includes('habits.html')) return 'habits';
        if (path.includes('bio.html')) return 'bio';
        if (path.includes('gym.html')) return 'gym';
        return 'dashboard';
    }

    init() {
        this.setupEventListeners();
        this.setupGlowTracking();
        this.setupBroadcastChannel();
        this.renderApp();
        window.addEventListener('stateUpdate', () => this.renderApp());
        window.addEventListener('storage', (event) => {
            if (event.key !== this.storageKey || !event.newValue) return;
            this.isCommitting = true;
            this.state = this.createReactiveState(this.mergeState(this.defaultState(), JSON.parse(event.newValue)));
            this.isCommitting = false;
            this.pulseSystemStatus();
            this.renderApp();
        });
    }

    setupBroadcastChannel() {
        if (!this.syncChannel) return;
        this.syncChannel.addEventListener('message', (event) => {
            if (!event.data || event.data.source === this.instanceId || event.data.type !== 'aether-state-update') return;
            this.isCommitting = true;
            this.state = this.createReactiveState(this.mergeState(this.defaultState(), event.data.state));
            this.isCommitting = false;
            this.pulseSystemStatus();
            this.renderApp();
        });
    }

    commit(message, effect, mutation) {
        this.isCommitting = true;
        mutation();
        this.addFeed(message, effect);
        this.isCommitting = false;
        this.persist(message, effect);
    }

    addFeed(message, effect = 'Potential recalculated') {
        this.state.feed.unshift({ at: new Date().toISOString(), message, effect });
        this.state.feed = this.state.feed.slice(0, 24);
    }

    persist(message = '[SYSTEM]: Sync complete', effect = 'Dashboard refreshed') {
        this.isCommitting = true;
        this.state.lastUpdate = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        this.isCommitting = false;
        window.dispatchEvent(new CustomEvent('aether:state-refresh', { detail: { message, effect } }));
        window.dispatchEvent(new CustomEvent('stateUpdate', { detail: { message, effect, state: this.state } }));
        this.syncChannel?.postMessage({ type: 'aether-state-update', source: this.instanceId, state: JSON.parse(JSON.stringify(this.state)), message, effect });
        this.pulseSystemStatus();
        this.renderApp();
    }

    todayIndex() {
        return AetherCalculator.currentDayIndex(new Date());
    }

    getTDEE() {
        return AetherCalculator.tdee(this.state.bio);
    }

    getNutritionTotals() {
        return AetherCalculator.nutritionTotals(this.state.intakeLog || []);
    }

    getMacroBreakdown(totals = this.getNutritionTotals()) {
        return AetherCalculator.macroBreakdown(totals);
    }

    getBioSystemStatus(totals = this.getNutritionTotals()) {
        const macro = this.getMacroBreakdown(totals);
        if (Number(this.state.bio.hydration || 0) < 2000) return '[ALERT]: Neural Dehydration Imminent.';
        if (totals.kcal > 0 && macro.proteinPct < 20) return '[WARNING]: Amino Acid Deficit.';
        return '[SYSTEM]: Metabolic Equilibrium Tracking.';
    }

    getOneRM(entry) {
        return AetherCalculator.oneRM(entry);
    }

    getPowerStats() {
        return AetherCalculator.powerStats(this.state.gymLog || [], this.currentDate);
    }

    getPotentialBreakdown() {
        return AetherCalculator.potentialBreakdown(this.state, this.currentDate);
    }

    renderApp() {
        const score = this.getPotentialBreakdown().total;
        this.setPotentialScore(score);

        this.renderLiveFeed();
        if (this.currentPage === 'dashboard') this.renderDashboard();
        if (this.currentPage === 'habits') {
            this.renderMatrix();
            this.renderHabits();
        }
        if (this.currentPage === 'bio') this.renderBioTrackerUI();
        if (this.currentPage === 'gym') {
            this.renderGymLog();
            this.renderTemporalStream();
            this.renderExerciseArsenal();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    renderAll() {
        this.renderApp();
    }

    setupEventListeners() {
        if (this.currentPage === 'bio') {
            ['bio-weight', 'bio-height', 'bio-age', 'bio-hydration'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', (event) => {
                    const key = id.replace('bio-', '');
                    this.commit(`[SYSTEM]: ${key.toUpperCase()} calibration updated`, 'Bio score recalculated', () => {
                        this.state.bio[key] = parseFloat(event.target.value) || 0;
                    });
                });
            });

            document.getElementById('save-bio-btn')?.addEventListener('click', () => {
                this.commit('[SYSTEM]: Bio profile synchronized', 'Nutrition target refreshed', () => {});
            });

            document.querySelectorAll('.body-type-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.commit(`[SYSTEM]: ${btn.dataset.type.toUpperCase()} archetype selected`, 'System re-calibration', () => {
                        this.state.bio.bodyType = btn.dataset.type;
                    });
                });
            });

            document.querySelectorAll('.gender-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.commit(`[SYSTEM]: ${btn.dataset.gender.toUpperCase()} metabolism baseline selected`, 'TDEE recalibrated', () => {
                        this.state.bio.gender = btn.dataset.gender;
                    });
                });
            });
        }
    }

    setupGlowTracking() {
        document.addEventListener('pointermove', (event) => {
            document.querySelectorAll('.reactive-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 100;
                const y = ((event.clientY - rect.top) / rect.height) * 100;
                if (x >= -20 && x <= 120 && y >= -20 && y <= 120) {
                    card.style.setProperty('--mx', `${x}%`);
                    card.style.setProperty('--my', `${y}%`);
                }
            });
        }, { passive: true });
    }

    renderDashboard() {
        const chartEl = document.getElementById('potentialChart');
        const breakdown = this.getPotentialBreakdown();
        const nutritionTotals = this.getNutritionTotals();
        const powerStats = this.getPowerStats();
        const maxStreak = Math.max(0, ...(this.state.goodHabits || []).map(h => h.streak || 0));
        const sectorStats = AetherCalculator.activeSectorStats(this.state, new Date());
        const sectorDisplay = `${sectorStats.activeSectors}/${sectorStats.totalSectors}`;
        const focusComplete = sectorStats.totalSectors > 0 && sectorStats.activeSectors === sectorStats.totalSectors;

        this.setText('dash-streak', `${maxStreak} Days`);
        this.setText('dash-habits', sectorDisplay);
        this.setText('sectors-calibrated-display', sectorDisplay);
        this.setText('dash-calories', Math.round(nutritionTotals.kcal).toLocaleString());
        this.setText('dash-power-tier', powerStats.tier);
        this.setText('dash-power', `${Math.round(powerStats.total)} kg`);
        this.setWidth('dash-power-bar', `${powerStats.percent}%`);
        document.getElementById('focus-icon')?.classList.toggle('focus-complete-pulse', focusComplete);
        this.renderAlerts();

        if (chartEl && typeof Chart !== 'undefined') {
            const data = [breakdown.habits * 0.4, breakdown.nutrition * 0.3, breakdown.power * 0.3, Math.max(0, 100 - breakdown.total)];
            if (!this.mainChart) {
                this.mainChart = new Chart(chartEl, {
                    type: 'doughnut',
                    data: {
                        labels: ['Habits', 'Nutrition', 'Power', 'Deficit'],
                        datasets: [{
                            data,
                            backgroundColor: ['#00f3ff', '#10B981', '#7000ff', 'rgba(255,255,255,0.04)'],
                            borderWidth: 0,
                            circumference: 270,
                            rotation: 225,
                            cutout: '84%',
                            borderRadius: 18
                        }]
                    },
                    options: {
                        animation: { duration: 750, easing: 'easeOutQuart' },
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            } else {
                this.mainChart.data.datasets[0].data = data;
                this.mainChart.update('active');
            }
            chartEl.classList.remove('dashboard-gauge-pulse');
            void chartEl.offsetWidth;
            chartEl.classList.add('dashboard-gauge-pulse');
        }
    }

    renderAlerts() {
        const alerts = [];
        const hydration = Number(this.state.bio.hydration || 0);
        const breakdown = this.getPotentialBreakdown();
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(24, 0, 0, 0);
        const hoursToEnd = (endOfDay - now) / 36e5;
        const currentDayIndex = AetherCalculator.currentDayIndex(new Date());
        const openSectors = AetherCalculator.sectors(this.state).filter(sector => !sector.days?.[currentDayIndex]);

        if (hydration < 2000) alerts.push({ color: 'bg-crimson', title: 'Neural Dehydration Imminent', body: `${2000 - hydration}ml below neural baseline.` });
        if (openSectors.length && hoursToEnd <= 4) alerts.push({ color: 'bg-violet-neon', title: 'Habit Window Closing', body: `${openSectors.length} sector(s) still need calibration today.` });
        if (openSectors.length && hoursToEnd > 4) alerts.push({ color: 'bg-violet-neon', title: 'Sector Drift Detected', body: `${openSectors.map(s => s.name).slice(0, 2).join(', ')} pending calibration.` });
        if (this.getNutritionTotals().kcal === 0) alerts.push({ color: 'bg-cyan-neon', title: 'Fuel Signal Missing', body: 'No intake has been logged for the current cycle.' });

        const container = document.getElementById('sector-alerts');
        if (!container) return;
        container.innerHTML = alerts.map(alert => `
            <div class="flex gap-4 animate-in">
                <div class="w-1 ${alert.color} rounded-full"></div>
                <div>
                    <div class="text-white font-black text-xs uppercase">${alert.title}</div>
                    <div class="text-[10px] text-gray-500 mt-1">${alert.body}</div>
                </div>
            </div>
        `).join('');
    }

    renderLiveFeed() {
        const feedHTML = (this.state.feed || []).slice(0, 8).map(item => {
            const time = new Date(item.at).toLocaleTimeString([], { hour12: false });
            return `
                <div class="log-entry dashboard-feed-row hover:translate-x-0 group animate-in">
                    <div class="flex items-center gap-6">
                        <div class="text-cyan-neon font-black text-[10px] font-['JetBrains_Mono'] w-20">${time}</div>
                        <div class="text-white font-black text-xs uppercase tracking-widest">${item.message}</div>
                    </div>
                    <div class="text-[10px] text-gray-700 font-black">${item.effect}</div>
                </div>
            `;
        }).join('');

        const liveFeed = document.getElementById('live-feed');
        if (liveFeed) liveFeed.innerHTML = feedHTML;

        const terminal = document.getElementById('gym-terminal-log');
        if (terminal) {
            terminal.innerHTML = (this.state.feed || []).slice(0, 8).map(item => {
                const time = new Date(item.at).toLocaleTimeString([], { hour12: false });
                return `<div>> ${time} ${item.message}</div>`;
            }).join('');
        }
    }

    renderMatrix() {
        const matrix = document.getElementById('habit-matrix');
        if (!matrix) return;
        matrix.innerHTML = this.state.matrix.map((sector, sIdx) => {
            const optimized = sector.days.every(day => day === 1);
            const complete = sector.days.filter(day => day === 1).length;
            return `
            <div class="matrix-row ${optimized ? 'sector-optimized' : ''} animate-in" data-accent="${sector.color}">
                <div class="matrix-sector-label">
                    <div class="flex items-center gap-3">
                        <i data-lucide="${optimized ? 'badge-check' : 'activity'}" class="w-5 h-5 ${optimized ? 'text-cyan-neon' : 'text-gray-700'}"></i>
                        <h4 class="text-white font-black text-lg uppercase tracking-tight">${sector.name}</h4>
                    </div>
                    <span class="text-[8px] text-gray-600 font-black uppercase tracking-widest">Sector Calibration / ${complete} of ${sector.days.length}</span>
                </div>
                <div class="matrix-days">
                    ${sector.days.map((day, dIdx) => `
                        <button onclick="window.app.toggleMatrixDay(${sIdx}, ${dIdx})"
                            class="matrix-cell ${day === 1 ? 'active' : ''}"
                            aria-label="Toggle ${sector.name} day ${dIdx + 1}">
                        </button>
                    `).join('')}
                </div>
                <button onclick="window.app.removeSector(${sIdx})" class="matrix-remove" aria-label="Remove ${sector.name}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `}).join('');
    }

    toggleMatrixDay(sIdx, dIdx) {
        const sector = this.state.matrix[sIdx];
        const nextState = sector.days[dIdx] !== 1;
        this.commit(`[SYSTEM]: ${sector.name} D${String(dIdx + 1).padStart(2, '0')} ${nextState ? 'optimized' : 'cleared'}`, nextState ? '+ Matrix potential' : '- Matrix potential', () => {
            sector.days[dIdx] = nextState ? 1 : 0;
            this.state.sectors = this.state.matrix;
        });
    }

    renderHabits() {
        const renderList = (id, type) => {
            const list = document.getElementById(id);
            if (!list) return;
            const habits = this.state[type === 'good' ? 'goodHabits' : 'badHabits'] || [];
            const isGood = type === 'good';
            list.innerHTML = habits.map((h, i) => `
                <div class="habit-entry ${isGood ? 'ascension-entry' : 'decay-entry'} animate-in" style="animation-delay: ${i * 0.05}s">
                    <div class="flex items-center gap-4">
                        <div class="habit-icon ${h.streak > 0 ? 'active' : ''}">
                            <i data-lucide="${isGood ? 'trending-up' : 'shield-alert'}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="text-white font-black text-xs uppercase tracking-widest">${h.name}</div>
                            <div class="text-[8px] text-gray-600 font-black uppercase tracking-widest">${isGood ? 'Streak' : 'Degradation'}: ${h.streak} Days</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="window.app.updateStreak('${type}', ${i}, 1)" class="habit-step ${isGood ? 'good' : 'bad'}" aria-label="Increment ${h.name}">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.app.removeHabit('${type}', ${i})" class="p-2 text-gray-800 hover:text-red-500 transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        };
        renderList('good-habits-list', 'good');
        renderList('bad-habits-list', 'bad');
    }

    updateStreak(type, idx, amount) {
        const key = type === 'good' ? 'goodHabits' : 'badHabits';
        const habit = this.state[key][idx];
        const effect = type === 'good' ? '+ Ascension potential' : '[DEGRADATION]: Potential penalty';
        this.commit(`[SYSTEM]: ${habit.name} ${type === 'good' ? 'streak advanced' : 'decay registered'}`, effect, () => {
            this.state[key][idx].streak += amount;
        });
    }

    renderBioTrackerUI() {
        const bio = this.state.bio;
        const totals = this.getNutritionTotals();
        const tdee = this.getTDEE();
        const diff = Math.round(totals.kcal - tdee);
        const macro = this.getMacroBreakdown(totals);
        const systemStatus = this.getBioSystemStatus(totals);

        this.setValue('bio-weight', bio.weight);
        this.setValue('bio-height', bio.height);
        this.setValue('bio-age', bio.age);
        this.setValue('bio-hydration', bio.hydration);
        this.renderGenderToggle();
        this.setAnimatedNumber('bio-tdee', Math.round(tdee).toLocaleString());
        this.setText('bio-current', Math.round(totals.kcal).toLocaleString());
        this.setText('bio-balance', diff.toLocaleString());
        this.setText('bio-status', systemStatus);
        this.setText('macro-protein-label', `${Math.round(macro.proteinPct)}%`);
        this.setText('macro-carbs-label', `${Math.round(macro.carbsPct)}%`);
        this.setText('macro-fats-label', `${Math.round(macro.fatsPct)}%`);
        this.renderMacroPie(macro, totals.kcal);
        this.renderBioTerminal(systemStatus, totals);

        const balanceEl = document.getElementById('bio-balance');
        if (balanceEl) balanceEl.className = `metric-number text-4xl font-black ${Math.abs(diff) <= 100 ? 'text-emerald-500' : 'text-red-500'}`;
        document.getElementById('bio-balance-card')?.classList.toggle('balance-optimal', Math.abs(diff) <= 100);
        document.getElementById('bio-balance-card')?.classList.toggle('balance-deficit', Math.abs(diff) > 100);

        const list = document.getElementById('bio-intake-list');
        if (list) {
            const intakeLog = this.state.intakeLog || [];
            list.innerHTML = intakeLog.length ? intakeLog.map((item, i) => `
                <div class="intake-entry p-5 border-b border-white/5 flex items-center justify-between group ${i === 0 ? 'data-upload' : ''}">
                    <div class="flex items-center gap-4">
                        <div class="w-9 h-9 rounded-xl bg-cyan-neon/10 text-cyan-neon flex items-center justify-center">
                            <i data-lucide="binary" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <div class="text-white font-black text-xs uppercase tracking-widest">${item.name}</div>
                            <div class="text-[8px] text-gray-600 font-black uppercase tracking-widest font-['JetBrains_Mono']">P ${item.p}G / C ${item.c}G / F ${item.f}G</div>
                        </div>
                    </div>
                    <div class="font-['JetBrains_Mono'] text-cyan-neon text-xs font-black">${(item.p * 4) + (item.c * 4) + (item.f * 9)} KCAL</div>
                    <button onclick="window.app.removeIntake(${i})" class="opacity-0 group-hover:opacity-100 text-gray-800 hover:text-red-500 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('') : `
                <div class="p-10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
                    No intake data detected
                </div>
            `;
        }

        const bioShell = document.getElementById('bio-calibration-card');
        if (bioShell) bioShell.dataset.archetype = bio.bodyType;
        document.querySelectorAll('.body-type-btn').forEach(btn => {
            const isActive = btn.dataset.type === bio.bodyType;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('text-cyan-neon', isActive);
        });
    }

    renderGenderToggle() {
        document.querySelectorAll('.gender-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.gender === this.state.bio.gender);
        });
    }

    renderMacroPie(macro, totalKcal) {
        const chartEl = document.getElementById('macroPieChart');
        if (!chartEl || typeof Chart === 'undefined') return;
        const hasData = totalKcal > 0;
        const data = hasData
            ? [macro.proteinKcal, macro.carbsKcal, macro.fatsKcal]
            : [1, 1, 1];
        const colors = hasData
            ? ['#00f3ff', '#7000ff', '#EF4444']
            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)'];

        if (this.macroPieChart && this.macroPieChart.canvas !== chartEl) {
            this.macroPieChart.destroy();
            this.macroPieChart = null;
        }

        if (!this.macroPieChart) {
            this.macroPieChart = new Chart(chartEl, {
                type: 'pie',
                data: {
                    labels: ['Protein', 'Carbs', 'Fats'],
                    datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 10 }]
                },
                options: {
                    animation: { duration: 650 },
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        } else {
            this.macroPieChart.data.datasets[0].data = data;
            this.macroPieChart.data.datasets[0].backgroundColor = colors;
            this.macroPieChart.update();
        }
    }

    renderBioTerminal(status, totals) {
        const terminal = document.getElementById('bio-terminal-feed');
        if (!terminal) return;
        const lines = [
            `> ${status}`,
            `> KCAL ${Math.round(totals.kcal).toLocaleString()} / PROTEIN ${Math.round(totals.protein)}G`,
            `> STATE BROADCAST: aether_state synchronized`
        ];
        terminal.innerHTML = lines.map(line => `<div>${line}</div>`).join('');
    }

    showFoodModal() {
        const overlay = document.getElementById('modal-overlay');
        const mContent = document.getElementById('modal-content');
        const mSubmit = document.getElementById('modal-submit');
        if (!overlay || !mContent || !mSubmit) return;
        mContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input id="f-name" type="text" class="aether-modal-input md:col-span-2" placeholder="Food Name">
                <input id="f-p" type="text" inputmode="decimal" class="aether-modal-input" placeholder="Protein (g)">
                <input id="f-c" type="text" inputmode="decimal" class="aether-modal-input" placeholder="Carbs (g)">
                <input id="f-f" type="text" inputmode="decimal" class="aether-modal-input md:col-span-2" placeholder="Fats (g)">
                <div class="md:col-span-2 text-[9px] text-gray-600 font-black uppercase tracking-[0.24em] font-['JetBrains_Mono']">
                    4-4-9 caloric mapping active
                </div>
            </div>
        `;
        this.openModal(overlay, mSubmit, () => {
            const name = document.getElementById('f-name').value.trim();
            if (!name) return;
            const entry = {
                name,
                p: parseFloat(document.getElementById('f-p').value) || 0,
                c: parseFloat(document.getElementById('f-c').value) || 0,
                f: parseFloat(document.getElementById('f-f').value) || 0
            };
            const currentTotals = this.getNutritionTotals();
            const projectedTotals = {
                protein: currentTotals.protein + entry.p,
                carbs: currentTotals.carbs + entry.c,
                fat: currentTotals.fat + entry.f,
                kcal: currentTotals.kcal + AetherCalculator.foodCalories(entry)
            };
            this.commit(`[SYSTEM]: ${name} data upload complete`, this.getBioSystemStatus(projectedTotals), () => {
                this.state.intakeLog.push(entry);
                this.state.bio.intakeLog = this.state.intakeLog;
            });
            this.closeModal(overlay);
        });
    }

    removeIntake(i) {
        this.commit('[SYSTEM]: Intake entry removed', 'Nutrition potential recalculated', () => {
            this.state.intakeLog.splice(i, 1);
            this.state.bio.intakeLog = this.state.intakeLog;
        });
    }

    initGym() {
        this.currentDate = new Date();
        this.renderApp();
    }

    changeMonth(offset) {
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);
        this.renderApp();
    }

    changeYear(offset) {
        this.currentDate.setFullYear(this.currentDate.getFullYear() + offset);
        this.renderApp();
    }

    jumpToToday() {
        this.currentDate = new Date();
        this.renderApp();
    }

    setDate(iso) {
        this.currentDate = new Date(iso);
        this.renderApp();
    }

    renderTemporalStream() {
        const stream = document.getElementById('temporal-stream');
        if (!stream) return;
        stream.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const currentISO = this.currentDate.toISOString().split('T')[0];

        this.setText('current-month-display', this.currentDate.toLocaleDateString([], { month: 'long' }));
        this.setText('current-year-display', year);

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const iso = d.toISOString().split('T')[0];
            const isSelected = iso === currentISO;
            const btn = document.createElement('button');
            btn.onclick = () => this.setDate(iso);
            btn.className = `date-btn ${isSelected ? 'active' : ''}`;
            btn.innerHTML = `
                <span class="text-[9px] font-black uppercase tracking-widest opacity-60">${d.toLocaleDateString([], { weekday: 'short' })}</span>
                <span class="text-2xl font-black">${i}</span>
            `;
            stream.appendChild(btn);
            if (isSelected) {
                this.setText('current-date-display', d.toLocaleDateString([], { month: 'long', day: 'numeric' }));
                if (i > 5) window.requestAnimationFrame(() => btn.scrollIntoView({ behavior: 'smooth', inline: 'center' }));
            }
        }
    }

    renderExerciseArsenal(filter = 'All') {
        const arsenal = document.getElementById('exercise-arsenal');
        if (!arsenal) return;

        const exercises = [
            { name: 'Bench Press', icon: 'dumbbell', color: 'text-violet-neon', desc: 'Chest Sector', cat: 'Push' },
            { name: 'Deadlift', icon: 'weight', color: 'text-crimson', desc: 'Power Sector', cat: 'Pull' },
            { name: 'Squats', icon: 'zap', color: 'text-gold', desc: 'Leg Sector', cat: 'Legs' },
            { name: 'Overhead Press', icon: 'arrow-up-circle', color: 'text-cyan-neon', desc: 'Shoulder Sector', cat: 'Push' },
            { name: 'Running', icon: 'wind', color: 'text-sky-400', desc: 'Cardio Sector', cat: 'Cardio' }
        ];
        const categories = ['All', 'Push', 'Pull', 'Legs', 'Cardio'];
        const filtered = filter === 'All' ? exercises : exercises.filter(ex => ex.cat === filter);

        arsenal.innerHTML = `<div class="col-span-full mb-6 flex gap-3 overflow-x-auto no-scrollbar">
            ${categories.map(cat => `<button onclick="window.app.renderExerciseArsenal('${cat}')" class="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === cat ? 'bg-cyan-neon text-black' : 'bg-white/5 text-gray-500 hover:text-white'}">${cat}</button>`).join('')}
        </div>` + filtered.map(ex => `
            <button class="arsenal-card group animate-in text-left" onclick="window.app.showGymModal('${ex.name}')">
                <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 transition-colors ${ex.color}">
                    <i data-lucide="${ex.icon}" class="w-8 h-8"></i>
                </div>
                <h4 class="text-white font-black text-lg uppercase tracking-tight mb-1">${ex.name}</h4>
                <p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">${ex.desc}</p>
            </button>
        `).join('');
    }

    renderGymLog() {
        const body = document.getElementById('gym-log-body');
        const emptyState = document.getElementById('log-empty-state');
        if (!body) return;

        const currentISO = this.currentDate.toISOString().split('T')[0];
        const logs = (this.state.gymLog || []).filter(log => log.date?.split('T')[0] === currentISO);
        let totalPower = 0;
        body.innerHTML = '';

        if (!logs.length) {
            emptyState?.classList.replace('hidden', 'flex');
        } else {
            emptyState?.classList.replace('flex', 'hidden');
            logs.forEach(entry => {
                const oneRM = this.getOneRM(entry);
                totalPower += oneRM;
                const div = document.createElement('div');
                div.className = 'log-entry animate-in';
                div.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                            <i data-lucide="award" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="text-white font-black text-xs uppercase tracking-widest">${entry.exercise}</div>
                            <div class="text-[8px] text-gray-600 font-black uppercase tracking-widest">1RM: ${oneRM.toFixed(1)}KG</div>
                        </div>
                    </div>
                    <button onclick="window.app.removeWorkout(${entry.id})" class="p-2 text-gray-800 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                `;
                body.appendChild(div);
            });
        }

        this.setText('sector-power', `${totalPower.toFixed(0)} kg`);
        this.setWidth('power-bar', `${Math.min(100, (totalPower / 500) * 100)}%`);
    }

    showGymModal(prefill = '') {
        const overlay = document.getElementById('modal-overlay');
        const mContent = document.getElementById('modal-content');
        const mSubmit = document.getElementById('modal-submit');
        if (!overlay || !mContent || !mSubmit) return;
        mContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input id="g-ex" type="text" value="${prefill}" class="aether-modal-input md:col-span-2" placeholder="Exercise Name">
                <input id="g-w" type="text" inputmode="decimal" class="aether-modal-input" placeholder="Weight (KG)">
                <input id="g-r" type="text" inputmode="numeric" class="aether-modal-input" placeholder="Reps">
                <div class="md:col-span-2 text-[9px] text-gray-600 font-black uppercase tracking-[0.24em] font-['JetBrains_Mono']">
                    Brzycki 1RM mapping active
                </div>
            </div>
        `;
        this.openModal(overlay, mSubmit, () => {
            const exercise = document.getElementById('g-ex').value.trim();
            if (!exercise) return;
            const weight = parseFloat(document.getElementById('g-w').value) || 0;
            const reps = parseInt(document.getElementById('g-r').value, 10) || 0;
            this.commit(`[SYSTEM]: ${exercise} power log added`, `${this.getOneRM({ weight, reps }).toFixed(1)}KG 1RM`, () => {
                this.state.gymLog.push({ id: Date.now(), exercise, weight, reps, date: this.currentDate.toISOString() });
            });
            this.closeModal(overlay);
        });
    }

    removeWorkout(id) {
        this.commit('[SYSTEM]: Performance entry removed', 'Power score recalculated', () => {
            this.state.gymLog = this.state.gymLog.filter(log => log.id !== id);
        });
    }

    showAddSectorModal() {
        const overlay = document.getElementById('modal-overlay');
        const mContent = document.getElementById('modal-content');
        const mSubmit = document.getElementById('modal-submit');
        if (!overlay || !mContent || !mSubmit) return;
        mContent.innerHTML = `
            <div class="space-y-6">
                <input id="s-name" type="text" class="bio-input font-['JetBrains_Mono']" placeholder="Sector Name">
                <div class="grid grid-cols-3 gap-3">
                    <label class="sector-color-option violet"><input type="radio" name="s-color" value="violet-neon" checked><span>Violet</span></label>
                    <label class="sector-color-option cyan"><input type="radio" name="s-color" value="cyan-neon"><span>Cyan</span></label>
                    <label class="sector-color-option crimson"><input type="radio" name="s-color" value="crimson"><span>Crimson</span></label>
                </div>
            </div>
        `;
        this.openModal(overlay, mSubmit, () => {
            const name = document.getElementById('s-name').value.trim();
            if (!name) return;
            const selectedColor = document.querySelector('input[name="s-color"]:checked')?.value || 'cyan-neon';
            this.commit(`[SYSTEM]: ${name} sector created`, 'Habit model expanded', () => {
                this.state.matrix.push({ id: Date.now(), name, color: selectedColor, days: Array(30).fill(0) });
                this.state.sectors = this.state.matrix;
            });
            this.closeModal(overlay);
        });
    }

    removeSector(i) {
        const name = this.state.matrix[i]?.name || 'Sector';
        this.commit(`[SYSTEM]: ${name} sector removed`, 'Habit model compressed', () => {
            this.state.matrix.splice(i, 1);
            this.state.sectors = this.state.matrix;
        });
    }

    showHabitModal(type) {
        const overlay = document.getElementById('modal-overlay');
        const mContent = document.getElementById('modal-content');
        const mSubmit = document.getElementById('modal-submit');
        if (!overlay || !mContent || !mSubmit) return;
        mContent.innerHTML = `<input id="h-name" type="text" class="bio-input font-['JetBrains_Mono']" placeholder="${type === 'good' ? 'Ascension' : 'Decay'} Protocol Name">`;
        this.openModal(overlay, mSubmit, () => {
            const name = document.getElementById('h-name').value.trim();
            if (!name) return;
            this.commit(`[SYSTEM]: ${name} protocol registered`, 'Habit network updated', () => {
                this.state[type === 'good' ? 'goodHabits' : 'badHabits'].push({ name, streak: 0 });
            });
            this.closeModal(overlay);
        });
    }

    removeHabit(type, i) {
        const key = type === 'good' ? 'goodHabits' : 'badHabits';
        const name = this.state[key][i]?.name || 'Protocol';
        this.commit(`[SYSTEM]: ${name} protocol removed`, 'Habit network updated', () => {
            this.state[key].splice(i, 1);
        });
    }

    openModal(overlay, submit, callback) {
        overlay.classList.replace('hidden', 'flex');
        const newSubmit = submit.cloneNode(true);
        submit.parentNode.replaceChild(newSubmit, submit);
        newSubmit.addEventListener('click', callback);
    }

    closeModal(overlay) {
        overlay.classList.replace('flex', 'hidden');
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }

    setPotentialScore(score) {
        document.querySelectorAll('#potential-score-nav, #potential-score').forEach(el => {
            const next = `${score}%`;
            if (el.innerText !== next) {
                el.innerText = next;
                el.classList.remove('score-pulse');
                void el.offsetWidth;
                el.classList.add('score-pulse');
            }
        });
    }

    setAnimatedNumber(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.innerText !== String(value)) {
            el.innerText = value;
            el.classList.remove('odometer-roll');
            void el.offsetWidth;
            el.classList.add('odometer-roll');
            document.getElementById('bio-tdee-card')?.classList.add('metric-pulse');
            window.clearTimeout(this.tdeePulseTimer);
            this.tdeePulseTimer = window.setTimeout(() => {
                el.classList.remove('odometer-roll');
                document.getElementById('bio-tdee-card')?.classList.remove('metric-pulse');
            }, 650);
        }
    }

    setValue(id, value) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = value;
    }

    setWidth(id, value) {
        const el = document.getElementById(id);
        if (el) el.style.width = value;
    }

    pulseSystemStatus() {
        document.querySelectorAll('.system-status-badge').forEach(el => {
            el.classList.remove('sync-pulse');
            void el.offsetWidth;
            el.classList.add('sync-pulse');
        });
    }
}

window.AetherCalculator = AetherCalculator;
window.app = new AetherSystem();
