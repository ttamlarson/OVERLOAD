/* OVERLOAD AI coaching client.
 * The endpoint is a deployment-time setting in index.html metadata.
 * No provider key or reusable bearer token belongs in this browser module.
 */
(() => {
  'use strict';
  const endpoint = () => {
    const node = document.querySelector('meta[name="overload-ai-endpoint"]');
    return node ? String(node.content || '').trim() : '';
  };
  const day = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  const num = value => {
    const parsed = value === null || value === undefined || value === '' ? 0 : Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const dateAge = (value, today) => {
    const a = new Date(day(value) + 'T12:00:00');
    const b = new Date(day(today) + 'T12:00:00');
    return day(value) && day(today) && Number.isFinite(a.getTime()) && Number.isFinite(b.getTime())
      ? Math.floor((b - a) / 86400000) : Infinity;
  };
  function buildWeeklyReview(state, today) {
    const workouts = Array.isArray(state?.workouts) ? state.workouts : [];
    const recent = workouts.filter(w => {
      const age = dateAge(w?.date, today);
      return age >= 0 && age < 14;
    }).sort((a,b) => String(a.date).localeCompare(String(b.date))).slice(-8).map(w => {
      let workingSets = 0, tonnageKg = 0;
      (Array.isArray(w?.exercises) ? w.exercises : []).forEach(ex => {
        (Array.isArray(ex?.sets) ? ex.sets : []).forEach(set => {
          const weight = num(set?.weight), reps = num(set?.reps);
          if (weight > 0 && reps > 0) { workingSets++; tonnageKg += weight * reps; }
        });
      });
      return { date: day(w.date), label: String(w.type || w.name || 'Workout').slice(0,80), workingSets, tonnageKg: Math.round(tonnageKg) };
    });
    const recoveries = Array.isArray(state?.recoveries) ? state.recoveries : [];
    const latest = recoveries.filter(r => day(r?.date)).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    const recovery = latest ? {
      date: day(latest.date), sleepHours: num(latest.sleep), energy: num(latest.energy),
      stress: num(latest.stress), soreness: num(latest.soreness)
    } : null;
    const foods = Array.isArray(state?.foods) ? state.foods : [];
    const periodFoods = foods.filter(f => dateAge(f?.date, today) >= 0 && dateAge(f?.date, today) < 7);
    const nutrition = periodFoods.length ? {
      calories: Math.round(periodFoods.reduce((sum,f) => sum + num(f.cal ?? f.calories), 0) / Math.max(1, new Set(periodFoods.map(f=>f.date)).size)),
      calorieTarget: num(state?.settings?.calories),
      proteinGrams: Math.round(periodFoods.reduce((sum,f) => sum + num(f.pro ?? f.protein), 0) / Math.max(1, new Set(periodFoods.map(f=>f.date)).size)),
      proteinTargetGrams: num(state?.settings?.protein)
    } : null;
    return {
      task: 'weekly_review',
      context: {
        goal: String(state?.settings?.goal || 'General strength and physique training').slice(0,240),
        period: 'Last 14 days',
        workouts: recent,
        ...(recovery ? { recovery } : {}),
        ...(nutrition ? { nutrition } : {})
      }
    };
  }
  async function requestWeeklyReview(context, consent, fetchImpl = fetch) {
    if (consent !== true) throw new Error('Review the data preview and provide consent before sending anything.');
    const url = endpoint();
    if (!url) throw new Error('AI coaching is not connected yet. Your data has not been sent.');
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('AI coaching endpoint is not configured correctly.'); }
    if (parsed.protocol !== 'https:') throw new Error('AI coaching requires a secure HTTPS endpoint.');
    const response = await fetchImpl(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'weekly_review', consent: true, context })
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(payload.error || 'AI coaching is temporarily unavailable.');
    if (!payload.result || typeof payload.result.summary !== 'string' || !Array.isArray(payload.result.suggestions)) {
      throw new Error('The AI response could not be verified. No training records were changed.');
    }
    return payload.result;
  }
  window.OverloadAI = Object.freeze({ endpoint, buildWeeklyReview, requestWeeklyReview });
})();
