// Motor de cálculo do Andre360: valores do mês, dias, semanas, bônus, cofre e projeção.
// O estado guarda só o que o André marcou; todo o resto é derivado daqui.
import { addDays, addMonths, daysInMonth, diffDays, pad, todayISO, weekday, ymOf } from './utils.js';
import { RUN_TYPES, GYM_TYPES } from './rules.js';

export function rulesFor(S, ym) {
  const keys = Object.keys(S.rules).sort();
  let r = S.rules[keys[0]];
  for (const k of keys) if (k <= ym) r = S.rules[k];
  return r;
}

// Valor de cada item no mês: peso × pote ÷ Σ(peso × ocorrências esperadas).
// Treinos: meta semanal × dias do mês ÷ 7. Refeições: uma por dia.
export function computeValues(r, ym) {
  const n = daysInMonth(ym);
  const occ = {};
  r.train.forEach((h) => (occ[h.id] = (h.perWeek * n) / 7));
  r.meals.forEach((h) => (occ[h.id] = n));
  const items = [...r.train, ...r.meals];
  const denom = items.reduce((a, h) => a + h.weight * occ[h.id], 0);
  const values = {};
  items.forEach((h) => (values[h.id] = denom ? (h.weight * r.pool) / denom : 0));
  return { values, occ };
}

const memo = { key: null, vals: new Map(), tl: null, months: new Map() };
function check(S) {
  const k = `${S.rev}|${todayISO()}`;
  if (memo.key !== k) {
    memo.key = k;
    memo.vals = new Map();
    memo.tl = null;
    memo.months = new Map();
  }
}

export function monthValues(S, ym) {
  check(S);
  if (!memo.vals.has(ym)) {
    const rules = rulesFor(S, ym);
    memo.vals.set(ym, { rules, ...computeValues(rules, ym) });
  }
  return memo.vals.get(ym);
}

export const mondayOf = (d) => addDays(d, -((weekday(d) + 6) % 7));

export function stravaActs(S, date, types) {
  const a = S.strava?.acts?.[date];
  return a ? a.filter((x) => types.includes(x.type)) : [];
}
export const stravaRuns = (S, date) => stravaActs(S, date, RUN_TYPES);
export const stravaGym = (S, date) => stravaActs(S, date, GYM_TYPES);

// Atividades do Strava ainda não confirmadas nem dispensadas neste dia.
export function stravaSuggestions(S, date) {
  const e = S.days[date] || {};
  const sv = e.sv || {};
  const out = [];
  for (const a of stravaRuns(S, date)) if (!sv[a.id]) out.push({ kind: 'run', a });
  for (const a of stravaGym(S, date)) if (!sv[a.id]) out.push({ kind: 'gym', a });
  return out;
}

function evalBase(S, date) {
  const { values, rules: r } = monthValues(S, ymOf(date));
  const e = S.days[date] || {};
  const joker = !!e.joker;
  const today = todayISO();
  let earned = 0;
  let lost = 0;

  const meals = r.meals.map((h) => {
    const v = e[h.id];
    const done = joker || v === true;
    const pending = !done && v === undefined && date === today;
    const amount = done ? values[h.id] : 0;
    earned += amount;
    return { h, done, pending, off: v === false && !joker, value: values[h.id], amount };
  });

  const c = e.c || {};
  const extras = (r.extras || []).map((h) => {
    const n = Math.min(h.max || 99, c[h.id] || 0);
    const amount = n * h.value;
    earned += amount;
    return { h, n, amount };
  });

  // Treinos: pagos depois, na passada semanal (até a meta da semana). Extras como a esteira na chuva também contam.
  const train = r.train.map((h) => {
    const via = extras.filter((x) => x.h.countsAs === h.id).reduce((a, x) => a + x.n, 0);
    return { h, n: Math.max(0, e[h.id] || 0) + via, via, paid: 0, extra: 0, jokerPaid: 0, amount: 0, value: values[h.id] };
  });

  const slips = r.slips.map((h) => {
    const n = c[h.id] || 0;
    const amount = n * h.value;
    lost += amount;
    return { h, n, amount };
  });

  return { date, ym: ymOf(date), rules: r, joker, meals, train, extras, slips, bonuses: [], earned, lost, note: e.note || '' };
}

// Percorre todos os dias desde o início.
export function timeline(S) {
  check(S);
  if (memo.tl) return memo.tl;
  const days = {};
  const order = [];
  const start = S.setup.startDate;
  const today = todayISO();
  let streak = 0;
  let best = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const b = evalBase(S, d);
    const sc = b.rules.bonuses.streak;
    const pending = b.meals.some((x) => x.pending);
    const allDone = b.meals.every((x) => x.done);
    if (allDone) {
      streak++;
      if (sc && sc.every > 0 && sc.value > 0 && streak % sc.every === 0)
        b.bonuses.push({ id: 'streak', emoji: '🔥', label: `${streak} dias seguidos na dieta`, amount: sc.value });
    } else if (!(pending && b.meals.every((x) => x.done || x.pending))) streak = 0;
    best = Math.max(best, streak);
    b.streak = streak;
    days[d] = b;
    order.push(d);
  }

  // Semanas (seg a dom): paga treinos até a meta, coringas cobrem o que faltou, semana perfeita.
  const weeks = {};
  for (const d of order) (weeks[mondayOf(d)] = weeks[mondayOf(d)] || []).push(d);
  const weekInfo = {};
  for (const [mon, ds] of Object.entries(weeks)) {
    const r = monthValues(S, ymOf(mon < start ? start : mon)).rules;
    const goals = {};
    r.train.forEach((h) => (goals[h.id] = { h, target: h.perWeek, count: 0, paid: 0, joker: 0 }));
    for (const d of ds) {
      for (const t of days[d].train) {
        const g = goals[t.h.id];
        if (!g) continue;
        g.count += t.n;
        const pay = Math.min(t.n, Math.max(0, g.target - g.paid));
        g.paid += pay;
        t.paid = pay;
        t.extra = t.n - pay;
        t.amount = pay * t.value;
        days[d].earned += t.amount;
      }
    }
    // Coringa: vale um treino que faltou na semana (corrida primeiro).
    const weekEnded = addDays(mon, 6) < today;
    for (const d of ds) {
      if (!days[d].joker) continue;
      const g = Object.values(goals).find((x) => x.paid + x.joker < x.target);
      if (!g) continue;
      // Só cobre quando a semana acabou, ou já no dia se nem dá mais tempo de bater a meta.
      const left = diffDays(today, addDays(mon, 6)) + 1;
      if (!weekEnded && left >= g.target - g.paid - g.joker) continue;
      g.joker++;
      const t = days[d].train.find((x) => x.h.id === g.h.id);
      t.jokerPaid++;
      t.amount += t.value;
      days[d].earned += t.value;
    }
    const all = Object.values(goals);
    const perfect = all.length && all.every((g) => g.paid + g.joker >= g.target) && all.some((g) => g.target > 0);
    if (perfect && r.bonuses.perfectWeek > 0) {
      // Bônus no dia em que a meta foi batida.
      let hit = ds[ds.length - 1];
      const acc = {};
      for (const d of ds) {
        days[d].train.forEach((t) => (acc[t.h.id] = (acc[t.h.id] || 0) + t.paid));
        if (all.every((g) => (acc[g.h.id] || 0) + g.joker >= g.target)) {
          hit = d;
          break;
        }
      }
      days[hit].bonuses.push({ id: 'week', emoji: '🏁', label: 'Semana perfeita de treinos', amount: r.bonuses.perfectWeek });
    }
    weekInfo[mon] = { mon, goals, perfect: !!perfect, days: ds };
  }

  let total = 0;
  for (const d of order) {
    const b = days[d];
    b.bonusTotal = b.bonuses.reduce((a, x) => a + x.amount, 0);
    b.earned += b.bonusTotal;
    b.net = b.earned - b.lost;
    total += b.net;
    b.cum = total;
    const mealsOk = b.meals.every((x) => x.done);
    const anyPending = b.meals.some((x) => x.pending);
    b.status = b.lost > 0 ? (b.net < 0 ? 'bad' : 'mixed') : mealsOk ? 'perfect' : anyPending ? 'pending' : 'partial';
  }
  memo.tl = { days, order, streak, best, weeks: weekInfo, total };
  return memo.tl;
}

// Cofre do tênis: tudo que ganhou menos o que perdeu, menos os tênis já comprados.
export function wallet(S) {
  const T = timeline(S);
  const spent = (S.shoes || []).reduce((a, x) => a + (x.price || 0), 0);
  const balance = T.total - spent;
  const price = S.goal?.price || 0;
  const today = todayISO();
  // Ritmo: média dos últimos 28 dias completos (sem contar hoje, que está em andamento).
  const from = addDays(today, -28) < S.setup.startDate ? S.setup.startDate : addDays(today, -28);
  let sum = 0;
  let n = 0;
  for (let d = from; d < today; d = addDays(d, 1)) {
    sum += T.days[d].net;
    n++;
  }
  if (!n) {
    sum = T.days[today].net;
    n = 1;
  }
  const pace = sum / n; // R$ por dia
  const missing = Math.max(0, price - balance);
  const eta = missing === 0 ? 0 : pace > 0.01 ? Math.ceil(missing / pace) : null;
  return { balance, spent, price, pct: price ? Math.max(0, Math.min(1, balance / price)) : 0, missing, pace, eta, ready: price > 0 && balance >= price };
}

export function weekOf(S, date) {
  const T = timeline(S);
  return T.weeks[mondayOf(date)] || null;
}

export function monthSummary(S, ym) {
  check(S);
  if (memo.months.has(ym)) return memo.months.get(ym);
  const T = timeline(S);
  const start = S.setup.startDate;
  const today = todayISO();
  const { values, rules: r, occ } = monthValues(S, ym);
  const n = daysInMonth(ym);
  let earned = 0, lost = 0, bonus = 0, jokers = 0, km = 0, mealsDone = 0, mealsAll = 0;
  const days = [];
  const stats = {};
  r.train.forEach((h) => (stats[h.id] = { h, n: 0, paid: 0, amount: 0 }));
  r.meals.forEach((h) => (stats[h.id] = { h, done: 0, all: 0, amount: 0 }));
  r.slips.forEach((h) => (stats[h.id] = { h, n: 0, days: 0, amount: 0 }));
  (r.extras || []).forEach((h) => (stats[h.id] = { h, n: 0, days: 0, amount: 0 }));
  for (let i = 1; i <= n; i++) {
    const d = `${ym}-${pad(i)}`;
    if (d < start || d > today) continue;
    const b = T.days[d];
    days.push(b);
    earned += b.earned;
    lost += b.lost;
    bonus += b.bonusTotal;
    if (b.joker) jokers++;
    stravaRuns(S, d).forEach((a) => (km += a.km));
    b.train.forEach((t) => {
      const s = stats[t.h.id];
      if (!s) return;
      s.n += t.n;
      s.paid += t.paid;
      s.amount += t.amount;
    });
    b.meals.forEach((x) => {
      const s = stats[x.h.id];
      if (!s || x.pending) return;
      s.all++;
      mealsAll++;
      if (x.done) {
        s.done++;
        mealsDone++;
        s.amount += x.amount;
      }
    });
    [...b.slips, ...b.extras].forEach((x) => {
      const s = stats[x.h.id];
      if (!s) return;
      s.n += x.n;
      if (x.n) s.days++;
      s.amount += x.amount;
    });
  }
  const res = { ym, rules: r, values, occ, days, earned, lost, bonus, net: earned - lost, jokers, km, stats, mealsDone, mealsAll, pool: r.pool };
  memo.months.set(ym, res);
  return res;
}

export function canEdit(S, date) {
  const t = todayISO();
  if (!S.setup || date > t || date < S.setup.startDate) return false;
  if (diffDays(date, t) <= 2) return true;
  return diffDays(S.setup.setupDate, t) <= 2;
}

export function editableDates(S) {
  const t = todayISO();
  const out = [];
  for (let d = S.setup.startDate; d <= t; d = addDays(d, 1)) if (canEdit(S, d)) out.push(d);
  return out;
}

export function jokersLeft(S, ym) {
  const r = rulesFor(S, ym);
  const used = Object.keys(S.days).filter((d) => d.startsWith(ym) && S.days[d].joker).length;
  return Math.max(0, (r.bonuses.jokers || 0) - used);
}

export function monthsTracked(S) {
  const cur = ymOf(todayISO());
  const out = [];
  for (let ym = ymOf(S.setup.startDate); ym <= cur; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

export function project(S) {
  const t = todayISO();
  const sixty = S.setup.sixty;
  const total = Math.max(1, diffDays(S.setup.startDate, sixty));
  const done = Math.max(0, diffDays(S.setup.startDate, t)) + 1;
  return { dayN: Math.min(done, total), total, toSixty: diffDays(t, sixty), pct: Math.min(1, done / total) };
}

// Totais do projeto, usados em Conquistas e no painel do padrinho.
export function totals(S) {
  const T = timeline(S);
  let runs = 0, gym = 0, meals = 0, sweets = 0, km = 0, longest = 0;
  const ex = {};
  for (const d of T.order) {
    const b = T.days[d];
    b.train.forEach((t) => (t.h.id === 'run' ? (runs += t.n) : t.h.id === 'gym' ? (gym += t.n) : 0));
    b.meals.forEach((x) => x.done && !b.joker && meals++);
    b.slips.forEach((x) => (sweets += x.n));
    b.extras.forEach((x) => (ex[x.h.id] = (ex[x.h.id] || 0) + x.n));
    stravaRuns(S, d).forEach((a) => {
      km += a.km;
      longest = Math.max(longest, a.km);
    });
  }
  return { runs, gym, meals, slips: sweets, km, longest, streak: T.streak, best: T.best, shoes: (S.shoes || []).length, extras: ex };
}
