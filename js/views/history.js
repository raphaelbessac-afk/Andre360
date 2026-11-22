// Tela "Semanas": resumo do mês e histórico semana a semana.
import { brl, esc, monthLabel, ymOf, addDays, WD_LETTER, weekday, fmtDay, num } from '../utils.js';
import { timeline, monthSummary, monthsTracked, canEdit, mondayOf } from '../engine.js';
import { eyelets } from './ui.js';
import { topBar } from './today.js';

function weekCard(S, mon, ym) {
  const T = timeline(S);
  const w = T.weeks[mon];
  if (!w) return '';
  const ds = w.days.filter((d) => ymOf(d) === ym);
  if (!ds.length) return '';
  const net = w.days.reduce((a, d) => a + T.days[d].net, 0);
  const goals = Object.values(w.goals);
  const end = addDays(mon, 6);
  return `<section class="card week ${w.perfect ? 'perfect' : ''}">
    <div class="wk-head"><b>${fmtDay(mon < S.setup.startDate ? S.setup.startDate : mon)} – ${fmtDay(end)}</b>${w.perfect ? '<span class="tag good">🏁 perfeita</span>' : ''}<span class="day-net ${net < 0 ? 'neg' : 'pos'}">${brl(net, true)}</span></div>
    <div class="wk-goals">${goals.map((g) => `<span>${g.h.emoji} ${eyelets(Math.min(g.count, 9), g.target)} <small>${Math.min(g.paid + g.joker, g.target)}/${g.target}</small></span>`).join('')}</div>
    <div class="days7">${w.days
      .map((d) => {
        const b = T.days[d];
        const meals = b.meals.map((x) => `<i class="m ${x.done ? 'on' : x.pending ? 'pend' : 'off'}"></i>`).join('');
        const slips = b.slips.reduce((a, x) => a + x.n, 0);
        const tr = b.train.reduce((a, t) => a + t.n, 0);
        return `<button class="d7 ${b.status}" ${canEdit(S, d) ? `data-act="edit-day" data-date="${d}"` : 'disabled'}>
          <span class="wl">${WD_LETTER[weekday(d)]}</span><span class="dn">${Number(d.slice(8))}</span>
          <span class="ms">${meals}</span>
          <span class="tr">${tr ? '👟'.repeat(Math.min(tr, 2)) : '·'}</span>
          <span class="sl">${slips ? `🍫${slips > 1 ? slips : ''}` : b.joker ? '🃏' : ''}</span>
        </button>`;
      })
      .join('')}</div>
  </section>`;
}

export function renderHistory(app) {
  const S = app.S;
  const months = monthsTracked(S);
  const ym = app.ui.hYm && months.includes(app.ui.hYm) ? app.ui.hYm : months[months.length - 1];
  const ms = monthSummary(S, ym);
  const st = ms.stats;
  const mons = [];
  const first = ms.days[0]?.date;
  if (first) for (let m = mondayOf(first); m <= (ms.days[ms.days.length - 1].date); m = addDays(m, 7)) mons.push(m);
  const i = months.indexOf(ym);
  return `${topBar(S)}
  <div class="mnav"><button class="btn ghost small" data-act="h-month" data-ym="${months[i - 1] || ''}" ${i > 0 ? '' : 'disabled'}>‹</button><h2>${monthLabel(ym)}</h2><button class="btn ghost small" data-act="h-month" data-ym="${months[i + 1] || ''}" ${i < months.length - 1 ? '' : 'disabled'}>›</button></div>
  <section class="card month">
    <div class="stats3"><div><small>Ganhou</small><b class="pos">${brl(ms.earned)}</b></div><div><small>Deslizes</small><b class="neg">${brl(-ms.lost)}</b></div><div><small>No cofre</small><b>${brl(ms.net, true)}</b></div></div>
    <div class="mstats">
      ${ms.rules.train.map((h) => `<div><span>${h.emoji} ${esc(h.name)}</span><b>${st[h.id].n} treino${st[h.id].n === 1 ? '' : 's'}</b><small>${brl(st[h.id].amount)}</small></div>`).join('')}
      ${ms.rules.meals.map((h) => `<div><span>${h.emoji} ${esc(h.name)}</span><b>${st[h.id].done}/${st[h.id].all}</b><small>${brl(st[h.id].amount)}</small></div>`).join('')}
      ${ms.rules.slips.map((h) => `<div><span>${h.emoji} ${esc(h.name)}</span><b>${st[h.id].n}×</b><small class="neg">${brl(-st[h.id].amount)}</small></div>`).join('')}
      <div><span>🎁 Bônus</span><b>${brl(ms.bonus)}</b><small>${ms.jokers ? `${ms.jokers} coringa${ms.jokers > 1 ? 's' : ''}` : ''}</small></div>
      ${ms.km ? `<div><span>🛣️ Km (Strava)</span><b>${num(ms.km)} km</b><small></small></div>` : ''}
    </div>
  </section>
  ${mons.slice().reverse().map((m) => weekCard(S, m, ym)).join('')}
  <p class="hint center">Toque num dia dos últimos 2 para editar.</p>`;
}

export const historyActions = {
  'h-month'(app, el) {
    if (!el.dataset.ym) return;
    app.ui.hYm = el.dataset.ym;
    app.render();
  },
  'edit-day'(app, el) {
    app.ui.date = el.dataset.date;
    app.go('hoje');
  },
};

