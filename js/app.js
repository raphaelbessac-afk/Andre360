// Andre360: orquestração, navegação, ações, celebrações, nuvem e Strava.
import { load, save, replace, setOnSave } from './store.js';
import * as Cloud from './cloud.js';
import { cloudActions, loginSheet, conflictSheet, statusLine, cloudSection } from './views/cloudui.js';
import { todayISO, ymOf, brl, esc, addDays } from './utils.js';
import { timeline, wallet, weekOf, project, totals, monthSummary } from './engine.js';
import { computeMedals, MEDALS } from './medals.js';
import { confetti, toast, burst } from './fx.js';
import * as Strava from './strava.js';
import { renderToday, todayActions } from './views/today.js';
import { renderHistory, historyActions } from './views/history.js';
import { renderMedals } from './views/medals.js';
import { renderTenis, tenisActions } from './views/tenis.js';
import { renderSettings, settingsActions, settingsInputs } from './views/settings.js';
import { renderOnboarding, onboardActions } from './views/onboard.js';
import { renderPadrinho, startPadrinho, padrinhoActions } from './views/padrinho.js';
import { shoe } from './views/ui.js';

const TABS = ['hoje', 'semanas', 'tenis', 'conquistas', 'ajustes'];

const app = {
  S: load(),
  ui: { tab: 'hoje', date: null, hYm: null },
  sheet: null,
  cheers: [],
  shareId: null,
};

const view = document.getElementById('view');
const tabs = document.getElementById('tabs');

// ---------- modo padrinho (#padrinho/<id>) ----------
const pm = location.hash.match(/^#padrinho\/([a-z0-9]{6,24})$/);
if (pm) app.shareId = pm[1];

app.render = function render() {
  if (app.shareId) {
    tabs.hidden = true;
    const msg = document.getElementById('pd-msg')?.value;
    view.innerHTML = renderPadrinho();
    if (msg) document.getElementById('pd-msg').value = msg;
    return;
  }
  const S = app.S;
  if (!S.setup) {
    tabs.hidden = true;
    view.innerHTML = renderOnboarding();
    return;
  }
  tabs.hidden = false;
  const t = app.ui.tab;
  const html = t === 'semanas' ? renderHistory(app) : t === 'tenis' ? renderTenis(app) : t === 'conquistas' ? renderMedals(app) : t === 'ajustes' ? renderSettings(app) : renderToday(app);
  view.innerHTML = html;
  view.dataset.tab = t;
  tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  const chip = document.querySelector('#daychips .chip.on');
  if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  app.animateCounts();
};

let lastHero = null;
app.animateCounts = function () {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const from = lastHero !== null ? lastHero : to;
    lastHero = to;
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = brl(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

app.go = function (tab) {
  app.ui.tab = TABS.includes(tab) ? tab : 'hoje';
  if (location.hash !== `#${app.ui.tab}`) history.replaceState(null, '', `#${app.ui.tab}`);
  app.render();
  window.scrollTo({ top: 0 });
};

app.saveQuiet = function () {
  save(app.S);
};

app.replaceState = function (data) {
  data.rev = Math.max(data.rev || 0, app.S.rev || 0) + 1;
  app.S = replace(data);
  save(app.S);
  app.render();
  watchCheers();
  schedulePublish();
};

// ---------- celebrações ----------
function metrics() {
  const S = app.S;
  if (!S.setup) return null;
  const T = timeline(S);
  const bonusKeys = new Set();
  const from = addDays(todayISO(), -3);
  for (const d of T.order) if (d >= from) T.days[d].bonuses.forEach((x) => bonusKeys.add(`${d}:${x.id}`));
  return { wallet: wallet(S), bonusKeys, medals: computeMedals(S).res };
}

function celebrate(before, after) {
  if (!before || !after) return;
  const S = app.S;
  const T = timeline(S);
  for (const k of after.bonusKeys) {
    if (!before.bonusKeys.has(k)) {
      const [d, id] = k.split(':');
      const bo = T.days[d].bonuses.find((x) => x.id === id);
      toast(`${bo.emoji} <b>${esc(bo.label)}</b> · ${brl(bo.amount, true)}`, { kind: 'good' });
      burst(innerWidth / 2, innerHeight / 3, { count: 40, emoji: '🪙' });
    }
  }
  // Cofre chegou ao preço do tênis
  if (!before.wallet.ready && after.wallet.ready && S.goal) {
    const gk = `goal:${S.goal.name}:${(S.shoes || []).length}`;
    if (!S.celebrated[gk]) {
      S.celebrated[gk] = true;
      save(S);
      setTimeout(() => {
        confetti();
        app.openSheet(
          () => `<div class="closing"><div class="podium">${shoe(1, { cls: 'hero-shoe', label: S.goal.name })}</div><small class="eyebrow">Cofre cheio</small>
          <div class="big-amount pos">${brl(after.wallet.balance)}</div><p class="lead"><b>Compra liberada!</b> O <b>${esc(S.goal.name)}</b> é seu. Foi suado! 👟💨</p>
          <button class="btn primary block big" data-act="go-tenis">Ver o cofre</button></div>`
        );
      }, 250);
    }
  }
  checkMedals(after.medals);
}

function checkMedals(res) {
  const S = app.S;
  const seen = S.seenMedals || {};
  const fresh = MEDALS.filter((m) => (res[m.id] || 0) > (seen[m.id] || 0));
  if (!fresh.length) return;
  S.seenMedals = { ...seen, ...res };
  save(S);
  fresh.slice(0, 2).forEach((m, i) =>
    setTimeout(() => {
      toast(`<span class="tm" style="--mc:${m.color}">${m.emoji}</span><div><small>Nova conquista!</small><b>${esc(m.name)}</b></div>`, { kind: 'medalt', ms: 4200 });
      confetti({ count: 90, coins: false });
    }, 400 + i * 1600)
  );
}

app.commit = function (mut) {
  const before = metrics();
  mut(app.S);
  save(app.S);
  app.render();
  if (app.sheet) app.refreshSheet();
  celebrate(before, metrics());
  schedulePublish();
};

// ---------- folha (bottom sheet) ----------
const sheetRoot = document.getElementById('sheet-root');
app.openSheet = function (renderFn, opts = {}) {
  app.sheet = { renderFn, opts };
  sheetRoot.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" data-act="close-sheet" aria-label="Fechar">✕</button><div class="sheet-body">${renderFn()}</div></div>`;
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => sheetRoot.classList.add('open'));
};
app.refreshSheet = function () {
  if (!app.sheet) return;
  const body = sheetRoot.querySelector('.sheet-body');
  const st = body.scrollTop;
  body.innerHTML = app.sheet.renderFn();
  body.scrollTop = st;
};
app.closeSheet = function () {
  if (!app.sheet) return;
  app.sheet = null;
  sheetRoot.classList.remove('open');
  document.body.classList.remove('noscroll');
  setTimeout(() => {
    if (!app.sheet) sheetRoot.innerHTML = '';
  }, 300);
};

// ---------- Strava ----------
app.stravaExchange = async function (code) {
  try {
    toast('Conectando ao Strava…');
    await Strava.exchangeCode(app.S, code);
    save(app.S);
    await app.stravaSync(true);
    toast('🟠 Strava conectado! Seus treinos do Garmin vão aparecer na tela Hoje.', { kind: 'good', ms: 5000 });
  } catch (e) {
    toast(`Não deu para conectar: ${esc(e.message)}`, { kind: 'bad', ms: 6000 });
  }
  app.render();
};

app.stravaSync = async function (verbose = false) {
  const st = app.S.strava;
  if (!st || !st.token || !navigator.onLine) return;
  try {
    const n = await Strava.sync(app.S);
    app.commit(() => {});
    if (verbose) toast(`🔄 ${n} atividades sincronizadas.`);
  } catch (e) {
    if (verbose) toast(`Strava: ${esc(e.message)}`, { kind: 'bad', ms: 5000 });
  }
};

function handleStravaCallback() {
  const q = new URLSearchParams(location.search);
  const code = q.get('code');
  const err = q.get('error');
  if (!code && !err) return;
  history.replaceState(null, '', location.pathname + '#ajustes');
  app.ui.tab = 'ajustes';
  if (err) return setTimeout(() => toast('Autorização do Strava cancelada.', { kind: 'bad' }), 300);
  const scope = q.get('scope') || '';
  if (!scope.includes('activity:read')) {
    setTimeout(() => toast('Deixe marcada a permissão de ver suas atividades e tente de novo.', { kind: 'bad', ms: 6000 }), 300);
    return;
  }
  const st = app.S.strava || {};
  if (st.clientId && st.clientSecret && app.S.setup) app.stravaExchange(code);
  else
    setTimeout(
      () =>
        app.openSheet(
          () => `<div class="closing"><div class="podium">🟠</div><h2>Quase lá!</h2><p class="lead">O Strava abriu fora do app. Copie o código abaixo, abra o <b>Andre360</b> e cole em <b>Ajustes › Strava › Voltou para o navegador?</b></p>
          <div class="code-box">${esc(code)}</div><button class="btn primary block" data-act="copy" data-v="${esc(code)}">Copiar código</button></div>`
        ),
      300
    );
}

function maybeSync() {
  const st = app.S.strava;
  if (st && st.token && (!st.lastSync || Date.now() - st.lastSync > 20 * 60000)) app.stravaSync(false);
}

// ---------- padrinho: resumo público ----------
function buildSummary() {
  const S = app.S;
  const T = timeline(S);
  const w = wallet(S);
  const wk = weekOf(S, todayISO());
  const p = project(S);
  const t = totals(S);
  const med = computeMedals(S);
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(todayISO(), -i);
    if (T.days[d]) last14.push({ d, s: T.days[d].status });
  }
  const lastMedal = MEDALS.filter((m) => med.res[m.id]).pop();
  return {
    name: S.setup.name,
    sixty: S.setup.sixty,
    dayN: p.dayN,
    projPct: Math.round(p.pct * 1000) / 1000,
    cofre: Math.round(w.balance * 100) / 100,
    goal: S.goal ? { name: S.goal.name, price: S.goal.price } : null,
    shoes: (S.shoes || []).map((x) => x.name),
    streak: T.streak,
    week: wk ? Object.values(wk.goals).map((g) => ({ name: g.h.name, emoji: g.h.emoji, target: g.target, done: g.paid + g.joker, count: g.count })) : [],
    last14,
    km: Math.round(t.km * 10) / 10,
    kmMonth: Math.round(monthSummary(S, ymOf(todayISO())).km * 10) / 10,
    medals: med.total,
    lastMedal: lastMedal ? lastMedal.name : '',
  };
}
let pubTimer;
function schedulePublish() {
  if (!app.S.setup || app.shareId) return;
  clearTimeout(pubTimer);
  pubTimer = setTimeout(() => Cloud.publishShare(app.S.share.id, buildSummary()), 2500);
}

let cheersOn = false;
function watchCheers() {
  if (cheersOn || !app.S.setup || !Cloud.getStatus().configured) return;
  cheersOn = true;
  Cloud.watchPublic(app.S.share.id, {
    onCheers(list) {
      const seenBefore = Math.max(0, ...app.cheers.map((c) => c.at));
      app.cheers = list;
      const fresh = list.filter((c) => c.at > (app.S.cheersSeen || 0) && c.at > seenBefore);
      if (fresh.length && seenBefore) toast(`📣 <b>${esc(fresh[0].from)}</b>: ${esc(fresh[0].emoji)} ${esc(fresh[0].msg)}`, { kind: 'good', ms: 5000 });
      if (app.ui.tab === 'hoje' && !app.sheet) app.render();
    },
  }).catch(() => (cheersOn = false));
}

// ---------- eventos ----------
const actions = {
  ...todayActions,
  ...historyActions,
  ...tenisActions,
  ...settingsActions,
  ...onboardActions,
  ...cloudActions,
  ...padrinhoActions,
  go(app, el) {
    app.go(el.dataset.tab);
    if (el.dataset.anchor) setTimeout(() => document.getElementById(el.dataset.anchor)?.scrollIntoView({ behavior: 'smooth' }), 50);
  },
  'go-tenis'(app) {
    app.closeSheet();
    app.go('tenis');
  },
  'close-sheet'(app) {
    app.closeSheet();
  },
};
const inputs = { ...settingsInputs };

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) {
    if (el.tagName !== 'A') ev.preventDefault();
    fn(app, el, ev);
  }
});
let tmr;
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-in]');
  if (!el) return;
  const fn = inputs[el.dataset.in];
  if (!fn || el.type === 'checkbox' || el.type === 'file') return;
  clearTimeout(tmr);
  tmr = setTimeout(() => fn(app, el), 250);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-in]');
  if (!el) return;
  const fn = inputs[el.dataset.in];
  if (fn && (el.type === 'checkbox' || el.type === 'file')) fn(app, el);
});
tabs.addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'hoje' && app.ui.tab === 'hoje') app.ui.date = todayISO();
  app.go(b.dataset.tab);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') app.closeSheet();
});

let lastDay = todayISO();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !app.S.setup || app.shareId) return;
  if (todayISO() !== lastDay) {
    lastDay = todayISO();
    app.ui.date = lastDay;
  }
  app.render();
  maybeSync();
  schedulePublish();
});

// ---------- nuvem ----------
app.cloudSetupHtml = () => cloudSection(app);
app.openLogin = function () {
  app.ui.loginMode = app.ui.loginMode || (app.S.setup ? 'up' : 'in');
  app.openSheet(() => loginSheet(app));
};
setOnSave(() => Cloud.changed());
app.startCloud = function () {
  Cloud.start({
    getState: () => app.S,
    setState(st) {
      st.rev = Math.max(st.rev || 0, app.S.rev || 0) + 1;
      const hadSetup = !!app.S.setup;
      app.S = replace(st);
      if (!hadSetup && app.S.setup) {
        app.closeSheet();
        app.go('hoje');
        toast('☁️ Dados restaurados da nuvem!', { kind: 'good' });
      } else if (!app.sheet) app.render();
      watchCheers();
    },
    onStatus(s) {
      document.querySelectorAll('[data-cloud-status]').forEach((el) => (el.innerHTML = statusLine(s)));
      const dot = document.getElementById('cloud-dot');
      if (dot) dot.className = `cdot ${s.state}`;
      if (s.signedIn && !app._lastCloudSigned) schedulePublish();
      if (app._lastCloudSigned !== s.signedIn && !app.sheet && ['ajustes', 'hoje'].includes(app.ui.tab)) {
        app._lastCloudSigned = s.signedIn;
        app.render();
      }
      app._lastCloudSigned = s.signedIn;
    },
    onConflict(remote, local, d) {
      return new Promise((resolve) => {
        app.openSheet(() => conflictSheet(remote, local, d));
        app._conflictCb = (v) => {
          app._conflictCb = null;
          app.closeSheet();
          resolve(v);
        };
      });
    },
  });
};

// ---------- início ----------
if (app.shareId) {
  document.body.classList.add('padrinho');
  app.render();
  startPadrinho(app.shareId, () => app.render());
} else {
  const hashTab = location.hash.replace('#', '');
  if (TABS.includes(hashTab)) app.ui.tab = hashTab;
  handleStravaCallback();
  app.render();
  app.startCloud();
  if (app.S.setup) {
    checkMedals(computeMedals(app.S).res);
    maybeSync();
    watchCheers();
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

