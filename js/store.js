// Persistência local (localStorage). Funciona offline; a nuvem sincroniza por cima.
import { DEFAULT_RULES, SIXTY, ATHLETE } from './rules.js';
import { clone, todayISO, ymOf } from './utils.js';

const KEY = 'andre360:v1';

const shareId = () => {
  const a = new Uint8Array(9);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
};

export function fresh() {
  return {
    v: 1,
    rev: 0,
    setup: null, // { startDate, setupDate, name, sixty }
    rules: {}, // { 'AAAA-MM': regras que valem a partir desse mês }
    days: {}, // { 'AAAA-MM-DD': { run: n, gym: n, lunch: bool, dinner: bool, c: {sweet: n}, joker, sv: {idAtividade: 'run'|'gym'|'no'} } }
    goal: null, // { name, price, url }
    shoes: [], // tênis conquistados: { name, price, date }
    strava: {},
    share: { id: shareId() },
    seenMedals: {},
    celebrated: {},
    cheersSeen: 0,
    hide: {},
    mig: { extras1: true },
  };
}

export function startState({ goal }) {
  const S = fresh();
  const t = todayISO();
  S.setup = { startDate: t, setupDate: t, name: ATHLETE, sixty: SIXTY };
  S.rules[ymOf(t)] = clone(DEFAULT_RULES);
  S.goal = goal;
  return S;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s._migrated) {
        delete s._migrated;
        localStorage.setItem(KEY, JSON.stringify(s));
      }
      return s;
    }
  } catch (e) {
    console.warn('Falha ao carregar dados', e);
  }
  return fresh();
}

let onSave = null;
export const setOnSave = (fn) => (onSave = fn);

export function save(S) {
  S.rev = (S.rev || 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    if (onSave) onSave();
    return true;
  } catch (e) {
    console.warn('Falha ao salvar', e);
    return false;
  }
}

export function replace(data) {
  const S = migrate(data);
  delete S._migrated;
  localStorage.setItem(KEY, JSON.stringify(S));
  return S;
}

export function wipe() {
  localStorage.removeItem(KEY);
}

// Migrações: idempotentes, cada uma com uma marca em s.mig (veja o PLAYBOOK).
function migrate(s) {
  const f = fresh();
  for (const k of Object.keys(f)) if (!(k in s)) s[k] = f[k];
  s.mig = s.mig || {};
  if (!s.share || !s.share.id) {
    s.share = { id: shareId() };
    s._migrated = true;
  }
  // v1.1: extras (leitura, esfiha sem sobremesa, esteira na chuva) valendo já no mês corrente.
  if (!s.mig.extras1) {
    for (const r of Object.values(s.rules || {})) if (!r.extras) r.extras = clone(DEFAULT_RULES.extras);
    s.mig.extras1 = true;
    s._migrated = true;
  }
  return s;
}
