// Tela "Hoje": cofre do tênis, contagem para os 60 e marcação do dia.
import { brl, esc, relDay, todayISO, ymOf, weekday, diffDays, num, WD_SHORT } from '../utils.js';
import { timeline, wallet, canEdit, editableDates, jokersLeft, weekOf, project, stravaSuggestions, stravaRuns, stravaGym } from '../engine.js';
import { floatText, centerOf, burst, toast } from '../fx.js';
import { shoe, eyelets, sole } from './ui.js';
import * as Cloud from '../cloud.js';

export function topBar(S) {
  const p = project(S);
  const cd = p.toSixty > 0 ? `faltam <b>${p.toSixty}</b> dias para os 60` : p.toSixty === 0 ? '<b>Hoje: 60 anos!</b>' : '<b>60 anos conquistados</b>';
  return `<header class="top">
    <div class="brand"><span class="wm">ANDRE<em>360</em></span><i id="cloud-dot" class="cdot ${Cloud.getStatus().state}"></i></div>
    <span class="pill cake">🎂 ${cd}</span>
  </header>`;
}

export function cofreHero(S, { compact = false } = {}) {
  const w = wallet(S);
  const g = S.goal;
  const eta = w.ready ? '' : w.eta === null ? 'marque seus dias para ver a previsão' : w.eta === 0 ? '' : `no ritmo atual, uns <b>${w.eta}</b> dia${w.eta === 1 ? '' : 's'}`;
  return `<section class="hero ${w.ready ? 'ready' : ''} ${w.balance < 0 ? 'neg' : ''}" data-act="go" data-tab="tenis">
    <div class="hero-label">Cofre do Tênis</div>
    <div class="hero-amount" data-count="${w.balance.toFixed(2)}">${brl(w.balance)}</div>
    ${shoe(w.pct, { cls: 'hero-shoe', label: `Cofre em ${Math.round(w.pct * 100)}% do tênis` })}
    ${g ? `<div class="hero-goal"><span class="goal-name">${esc(g.name)}</span><span>${Math.round(w.pct * 100)}% · ${brl(g.price)}</span></div>` : '<div class="hero-goal"><span class="goal-name">Escolha o próximo tênis</span></div>'}
    ${compact ? '' : w.ready
      ? `<div class="hero-sub big">👟 <b>Compra liberada!</b> Toque para resgatar.</div>`
      : g ? `<div class="hero-sub">faltam <b>${brl(w.missing)}</b>${eta ? ` · ${eta}` : ''}</div>` : ''}
  </section>`;
}

function projectBar(S) {
  const p = project(S);
  return `<div class="proj"><div class="proj-row"><span>Projeto 360 · dia <b>${p.dayN}</b> de ${p.total}</span><span>${Math.round(p.pct * 100)}%</span></div>${sole(p.pct)}</div>`;
}

function dayChips(S, sel) {
  const dates = editableDates(S);
  if (dates.length <= 1) return '';
  const T = timeline(S);
  return `<div class="chips" id="daychips">${dates
    .map((d) => {
      const b = T.days[d];
      const lbl = diffDays(d, todayISO()) <= 2 ? relDay(d) : `${WD_SHORT[weekday(d)]} ${Number(d.slice(8))}`;
      return `<button class="chip ${d === sel ? 'on' : ''}" data-act="pick-date" data-date="${d}"><i class="dot ${b.status}"></i>${lbl}</button>`;
    })
    .join('')}</div>`;
}

function mealRow(x, editable) {
  const st = x.done ? 'done' : x.off ? 'off' : x.pending ? 'todo' : 'miss';
  return `<div class="meal ${st}">
    <span class="hi">${x.h.emoji}</span>
    <span class="hn"><b>${esc(x.h.name)}</b><small>${x.done ? `na dieta · <em>+${brl(x.value)}</em>` : x.off ? 'fora da dieta' : x.pending ? `na dieta vale +${brl(x.value)}` : 'não marcado'}</small></span>
    <span class="yn">
      <button class="yes ${x.done ? 'on' : ''}" data-act="meal" data-id="${x.h.id}" data-v="1" ${editable ? '' : 'disabled'} aria-label="Na dieta">✓</button>
      <button class="no ${x.off ? 'on' : ''}" data-act="meal" data-id="${x.h.id}" data-v="0" ${editable ? '' : 'disabled'} aria-label="Fora da dieta">✕</button>
    </span>
  </div>`;
}

function trainRow(S, t, wk, date, editable) {
  const g = wk && wk.goals[t.h.id];
  const done = g ? g.paid + g.joker : 0;
  const target = g ? g.target : t.h.perWeek;
  const count = g ? g.count : t.n;
  const acts = t.h.id === 'run' ? stravaRuns(S, date) : stravaGym(S, date);
  const km = acts.reduce((a, r) => a + (r.km || 0), 0);
  const tag = acts.length ? `<span class="tag strava">Strava ${t.h.id === 'run' ? `${num(km)} km` : `${acts[0].min} min`}</span>` : '';
  let sub;
  if (t.n === 0) sub = done >= target ? 'meta da semana batida 🎉' : `vale +${brl(t.value)}`;
  else if (t.paid || t.jokerPaid) sub = `<em>+${brl(t.amount)}</em>${t.extra ? ` · ${t.extra} extra` : ''}`;
  else sub = 'treino extra (meta já batida)';
  return `<div class="train ${t.n ? 'done' : ''}">
    <span class="hi">${t.h.emoji}</span>
    <span class="hn"><b>${esc(t.h.name)}</b><small>${sub} ${tag}</small>
      <span class="wk">${eyelets(Math.min(count, 9), target)}<span class="wk-t">${Math.min(done, target)}/${target} na semana${count > target ? ` · +${count - target}` : ''}</span></span>
    </span>
    <span class="step">
      <button data-act="train" data-id="${t.h.id}" data-d="-1" ${editable && t.n ? '' : 'disabled'} aria-label="Tirar">−</button>
      <b>${t.n}</b>
      <button class="plus" data-act="train" data-id="${t.h.id}" data-d="1" ${editable ? '' : 'disabled'} aria-label="Adicionar">+</button>
    </span>
  </div>`;
}

function slipRow(x, editable) {
  return `<div class="slip ${x.n ? 'on' : ''}">
    <span class="hi">${x.h.emoji}</span>
    <span class="hn"><b>${esc(x.h.name)}</b><small>${x.n ? `<em class="neg">${brl(-x.amount)}</em>` : `−${brl(x.h.value)} cada`}</small></span>
    <span class="step">
      <button data-act="slip" data-id="${x.h.id}" data-d="-1" ${editable && x.n ? '' : 'disabled'} aria-label="Tirar">−</button>
      <b>${x.n}</b>
      <button class="plus bad" data-act="slip" data-id="${x.h.id}" data-d="1" ${editable ? '' : 'disabled'} aria-label="Adicionar">+</button>
    </span>
  </div>`;
}

function suggestions(S, date) {
  const list = stravaSuggestions(S, date);
  if (!list.length) return '';
  return `<section class="card sv">${list
    .map(
      ({ kind, a }) => `<div class="sv-row"><span class="sv-logo">S</span><div class="sv-t"><b>${kind === 'run' ? '🏃 Corrida' : '🏋️ Treino'}${a.km ? ` · ${num(a.km)} km` : ''} · ${a.min} min</b><small>${esc(a.name || '')}${a.garmin ? ' · Garmin' : ''}</small></div>
      <button class="btn small primary" data-act="sv-ok" data-aid="${a.id}" data-kind="${kind}">Registrar</button><button class="btn small ghost" data-act="sv-no" data-aid="${a.id}" aria-label="Ignorar">✕</button></div>`
    )
    .join('')}</section>`;
}

function prompts(app) {
  const S = app.S;
  const out = [];
  const cs = Cloud.getStatus();
  if (cs.configured && !cs.signedIn && !S.hide.cloud)
    out.push(`<section class="card nudge"><b>☁️ Proteja seus dados</b><p>Crie sua conta para não perder nada se trocar de celular, e para o padrinho acompanhar.</p><div class="row"><button class="btn primary small" data-act="fb-login">Criar conta</button><button class="btn ghost small" data-act="hide" data-k="cloud">Depois</button></div></section>`);
  if (!S.strava?.token && !S.hide.strava)
    out.push(`<section class="card nudge"><b><span class="sv-logo sm">S</span> Conectar Strava e Garmin</b><p>Suas corridas do relógio aparecem aqui para registrar com um toque.</p><div class="row"><button class="btn strava small" data-act="go" data-tab="ajustes" data-anchor="strava">Conectar</button><button class="btn ghost small" data-act="hide" data-k="strava">Depois</button></div></section>`);
  return out.join('');
}

function cheersCard(app) {
  const list = (app.cheers || []).filter((c) => c.at > (app.S.cheersSeen || 0));
  if (!list.length) return '';
  return `<section class="card cheers"><div class="ch-head"><b>📣 Recado do padrinho</b><button class="btn ghost small" data-act="cheers-seen">Valeu!</button></div>${list
    .slice(0, 3)
    .map((c) => `<div class="cheer"><span class="ce">${esc(c.emoji)}</span><div><b>${esc(c.msg)}</b><small>${esc(c.from)} · ${new Date(c.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></div>`)
    .join('')}</section>`;
}

export function renderToday(app) {
  const S = app.S;
  const today = todayISO();
  if (!app.ui.date || !canEdit(S, app.ui.date)) app.ui.date = today;
  const date = app.ui.date;
  const T = timeline(S);
  const b = T.days[date];
  const wk = weekOf(S, date);
  const editable = canEdit(S, date);
  const jl = jokersLeft(S, ymOf(date));
  const isToday = date === today;
  return `${topBar(S)}
  ${cofreHero(S)}
  ${projectBar(S)}
  ${cheersCard(app)}
  ${dayChips(S, date)}
  <h2 class="day-h">${isToday ? 'Hoje' : relDay(date)} <span class="day-net ${b.net < 0 ? 'neg' : b.net > 0 ? 'pos' : ''}">${brl(b.net, true)}</span></h2>
  ${suggestions(S, date)}
  <section class="card"><h3>Refeições</h3>${b.meals.map((x) => mealRow(x, editable)).join('')}
    ${b.streak > 0 ? `<p class="hint">🔥 ${b.streak} dia${b.streak > 1 ? 's' : ''} seguido${b.streak > 1 ? 's' : ''} na dieta · bônus a cada ${b.rules.bonuses.streak.every}</p>` : ''}</section>
  <section class="card"><h3>Treinos <small>meta semanal, qualquer dia</small></h3>${b.train.map((t) => trainRow(S, t, wk, date, editable)).join('')}</section>
  <section class="card slips"><h3>Deslizes <small>olho grande custa caro</small></h3>${b.slips.map((x) => slipRow(x, editable)).join('')}</section>
  ${b.bonuses.length ? `<section class="card bonus">${b.bonuses.map((x) => `<div class="bo">${x.emoji} ${esc(x.label)} <em>+${brl(x.amount)}</em></div>`).join('')}</section>` : ''}
  <section class="card joker-card">
    <div class="jk"><span>🃏</span><div><b>Coringa</b><small>Doente ou viajando? Conta as refeições do dia e cobre um treino da semana. ${jl} de ${b.rules.bonuses.jokers} no mês.</small></div>
    <button class="btn small ${b.joker ? 'primary' : 'ghost'}" data-act="joker" ${editable && (b.joker || jl > 0) ? '' : 'disabled'}>${b.joker ? 'Usado' : 'Usar'}</button></div>
  </section>
  ${prompts(app)}`;
}

function dayEntry(S, date) {
  return (S.days[date] = S.days[date] || {});
}

function gainFx(app, p, before) {
  const after = timeline(app.S).days[app.ui.date].net;
  const d = after - before;
  if (Math.abs(d) < 0.005) return;
  floatText(p.x, p.y - 10, brl(d, true), d > 0 ? 'good' : 'bad');
  if (d > 0) burst(p.x, p.y, { count: 10, emoji: '🪙', spread: 4 });
}

function change(app, el, mut) {
  const date = app.ui.date;
  if (!canEdit(app.S, date)) return;
  const before = timeline(app.S).days[date].net;
  const p = centerOf(el); // antes de re-renderizar
  app.commit((S) => mut(dayEntry(S, date), S));
  gainFx(app, p, before);
}

export const todayActions = {
  'pick-date'(app, el) {
    app.ui.date = el.dataset.date;
    app.render();
  },
  meal(app, el) {
    const v = el.dataset.v === '1';
    change(app, el, (e) => {
      e[el.dataset.id] = e[el.dataset.id] === v ? undefined : v;
      if (e[el.dataset.id] === undefined) delete e[el.dataset.id];
    });
    if (navigator.vibrate) navigator.vibrate(12);
  },
  train(app, el) {
    const d = Number(el.dataset.d);
    const id = el.dataset.id;
    change(app, el, (e) => {
      e[id] = Math.max(0, (e[id] || 0) + d);
      if (d < 0 && e.sv) {
        // tirou um treino: a atividade do Strava ligada a ele passa a "ignorada"
        const linked = Object.keys(e.sv).filter((k) => e.sv[k] === id);
        if (linked.length > e[id]) e.sv[linked[0]] = 'no';
      }
    });
    if (navigator.vibrate) navigator.vibrate(12);
  },
  slip(app, el) {
    const d = Number(el.dataset.d);
    change(app, el, (e) => {
      e.c = e.c || {};
      e.c[el.dataset.id] = Math.max(0, (e.c[el.dataset.id] || 0) + d);
    });
    if (d > 0) {
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 400);
    }
  },
  joker(app, el) {
    const date = app.ui.date;
    const e = app.S.days[date] || {};
    if (!e.joker && jokersLeft(app.S, ymOf(date)) <= 0) return toast('Sem coringas neste mês.');
    if (!e.joker && !confirm('Usar um coringa neste dia? As refeições contam como na dieta e ele cobre um treino que faltar na semana. Deslizes continuam valendo.')) return;
    change(app, el, (x) => (x.joker = !x.joker || undefined));
  },
  'sv-ok'(app, el) {
    const kind = el.dataset.kind;
    change(app, el, (e) => {
      e.sv = e.sv || {};
      e.sv[el.dataset.aid] = kind;
      e[kind] = (e[kind] || 0) + 1;
    });
  },
  'sv-no'(app, el) {
    change(app, el, (e) => {
      e.sv = e.sv || {};
      e.sv[el.dataset.aid] = 'no';
    });
  },
  hide(app, el) {
    app.commit((S) => (S.hide[el.dataset.k] = true));
  },
  'cheers-seen'(app) {
    const max = Math.max(...(app.cheers || []).map((c) => c.at), app.S.cheersSeen || 0);
    app.commit((S) => (S.cheersSeen = max));
  },
};
