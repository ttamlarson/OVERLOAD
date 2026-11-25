/* OVERLOAD device ecosystem bridge.
 * Read-only projection of the existing local-first record store. Never changes
 * apexProtocolData_v1 or writes back into the app's canonical data model.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'apexProtocolData_v1';
  const EVENT_NAME = 'overload:device-snapshot';
  const readState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === 'object' ? value : null;
    } catch (_) { return null; }
  };
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const localDateKey = date => {
    const pad = value => String(value).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  };
  const dateKey = value => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : localDateKey(d);
  };
  const buildSnapshot = () => {
    const state = readState();
    if (!state) return null;
    const today = localDateKey(new Date());
    const workouts = Array.isArray(state.workouts) ? state.workouts : [];
    const foods = Array.isArray(state.foods) ? state.foods : [];
    const todayFoods = foods.filter(item => dateKey(item.date) === today);
    const todayWorkout = workouts.find(item => dateKey(item.date) === today) || null;
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekCount = workouts.filter(item => {
      const d = new Date(item.date || item.savedAt || 0);
      return !Number.isNaN(d.getTime()) && d >= weekStart;
    }).length;
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      today,
      workoutCount: workouts.length,
      workoutsThisWeek: weekCount,
      todayWorkout: todayWorkout ? {
        name: String(todayWorkout.type || 'Workout').slice(0, 48),
        date: dateKey(todayWorkout.date),
        exerciseCount: Array.isArray(todayWorkout.exercises) ? todayWorkout.exercises.length : 0,
        durationMinutes: number(todayWorkout.duration)
      } : null,
      nutrition: {
        calories: Math.round(todayFoods.reduce((sum, item) => sum + number(item.cal ?? item.calories), 0)),
        protein: Math.round(todayFoods.reduce((sum, item) => sum + number(item.pro ?? item.protein), 0)),
        entries: todayFoods.length
      },
      targets: {
        calories: number(state.settings && state.settings.calories),
        protein: number(state.settings && state.settings.protein)
      },
      personalRecords: { bench: null, squat: null, deadlift: null },
      activeWorkout: state.current && Array.isArray(state.current.exercises) && state.current.exercises.length ? {
        name: String(state.current.type || 'Workout').slice(0, 48),
        exerciseCount: state.current.exercises.length,
        date: dateKey(state.current.date)
      } : null
    };
  };
  let scheduled = false;
  const publish = () => {
    scheduled = false;
    const snapshot = buildSnapshot();
    if (!snapshot) return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }));
    try {
      const bridge = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.OverloadDeviceBridge;
      if (bridge && typeof bridge.publishSnapshot === 'function') {
        const result = bridge.publishSnapshot({ snapshot });
        if (result && typeof result.catch === 'function') result.catch(() => {});
      }
    } catch (_) { /* Native bridge is optional; browser/PWA operation is unaffected. */ }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(publish);
  };
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    const result = originalSetItem.call(this, key, value);
    if (this === localStorage && key === STORAGE_KEY) schedule();
    return result;
  };
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) schedule();
  });
  const nativePlugin = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.OverloadDeviceBridge;
  window.OverloadDeviceBridge = Object.freeze({
    getSnapshot: buildSnapshot,
    refresh: publish,
    getPendingWatchSessions() {
      const plugin = nativePlugin();
      if (!plugin || typeof plugin.getPendingWatchSessions !== 'function') return Promise.resolve([]);
      return plugin.getPendingWatchSessions().then(result => Array.isArray(result.sessions) ? result.sessions : []).catch(() => []);
    },
    acknowledgeWatchSession(sessionId) {
      const plugin = nativePlugin();
      if (!plugin || typeof plugin.acknowledgeWatchSession !== 'function') return Promise.resolve({ acknowledged: false });
      return plugin.acknowledgeWatchSession({ sessionId });
    },
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      const handler = event => callback(event.detail);
      window.addEventListener(EVENT_NAME, handler);
      callback(buildSnapshot());
      return () => window.removeEventListener(EVENT_NAME, handler);
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', publish, { once: true });
  else publish();
})();
