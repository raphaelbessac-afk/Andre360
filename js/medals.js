// Conquistas: calculadas a partir do histórico (nada salvo à parte). Cada uma pode valer várias vezes.
import { timeline, totals, stravaRuns, project } from './engine.js';
import { ymOf, todayISO, monthEnd } from './utils.js';

export const MEDALS = [
  { id: 'first', emoji: '👟', name: 'Primeira passada', desc: 'Primeiro dia com almoço e jantar na dieta', color: '#D4FF3A' },
  { id: 'week', emoji: '🏁', name: 'Semana perfeita', desc: 'Bateu as metas de corrida e academia na semana', color: '#22D3EE', many: true },
  { id: 'diet7', emoji: '🔥', name: 'Pegando ritmo', desc: '7 dias seguidos na dieta', color: '#FF5A1F', many: true },
  { id: 'diet30', emoji: '🥇', name: 'Maratona da dieta', desc: '30 dias seguidos na dieta', color: '#FFB020', many: true },
  { id: 'nosweet7', emoji: '🍫', name: 'Boca fechada', desc: '7 dias seguidos sem doce', color: '#FF3D8B', many: true },
  { id: 'nosweet30', emoji: '🛡️', name: 'Blindado', desc: '30 dias seguidos sem doce', color: '#FF3D8B', many: true },
  { id: 'nopdq14', emoji: '🧀', name: 'Mineiro de respeito', desc: '14 dias seguidos sem pão de queijo', color: '#FFB020', many: true },
  { id: 'clean', emoji: '✨', name: 'Mês limpo', desc: 'Um mês inteiro sem doce nem pão de queijo', color: '#D4FF3A', many: true },
  { id: 'km50', emoji: '🛣️', name: '50 km no mês', desc: 'Correu 50 km num mês (Strava)', color: '#22D3EE', many: true },
  { id: 'km100', emoji: '🚀', name: '100 km no mês', desc: 'Correu 100 km num mês (Strava)', color: '#22D3EE', many: true },
  { id: 'half', emoji: '🎽', name: 'Meia maratona', desc: 'Uma corrida de 21 km ou mais (Strava)', color: '#FF5A1F', many: true },
  { id: 'km500', emoji: '🌎', name: '500 km no projeto', desc: '500 km corridos desde o início (Strava)', color: '#D4FF3A' },
  { id: 'km1000', emoji: '🪐', name: '1.000 km no projeto', desc: '1.000 km corridos desde o início (Strava)', color: '#D4FF3A' },
  { id: 'train50', emoji: '💪', name: '50 treinos', desc: '50 treinos registrados (corrida + academia)', color: '#FF5A1F' },
  { id: 'train150', emoji: '🦾', name: '150 treinos', desc: '150 treinos registrados', color: '#FF5A1F' },
  { id: 'shoe1', emoji: '🎁', name: 'Primeiro tênis', desc: 'Conquistou o primeiro tênis do cofre', color: '#FFB020' },
  { id: 'shoe4', emoji: '🗄️', name: 'Sapateira cheia', desc: 'Conquistou 4 tênis no projeto', color: '#FFB020' },
  { id: 'd100', emoji: '💯', name: '100 dias de projeto', desc: '100 dias desde o início', color: '#8B6CFF' },
  { id: 'd180', emoji: '🌓', name: 'Metade do caminho', desc: 'Metade do projeto rumo aos 60', color: '#8B6CFF' },
  { id: 'sixty', emoji: '🎂', name: '60 em grande estilo', desc: 'Chegou aos 60 com o projeto em dia', color: '#FFD23F' },
];

const memo = { key: null, val: null };

export function computeMedals(S) {
  const k = `${S.rev}|${todayISO()}`;
  if (memo.key === k) return memo.val;
  const T = timeline(S);
  const tot = totals(S);
  const res = {};
  const add = (id, n = 1) => (res[id] = (res[id] || 0) + n);
  let diet = 0, noSweet = 0, noPdq = 0;
  const monthKm = {};
  const monthSlips = {};
  const today = todayISO();
  for (const d of T.order) {
    const b = T.days[d];
    const isToday = d === today;
    const mealsOk = b.meals.every((x) => x.done);
    if (mealsOk) {
      if (!res.first) add('first');
      diet++;
      if (diet % 7 === 0) add('diet7');
      if (diet % 30 === 0) add('diet30');
    } else if (!isToday) diet = 0;
    const sw = b.slips.find((x) => x.h.id === 'sweet')?.n || 0;
    const pq = b.slips.find((x) => x.h.id === 'pdq')?.n || 0;
    if (!isToday) {
      noSweet = sw ? 0 : noSweet + 1;
      noPdq = pq ? 0 : noPdq + 1;
      if (noSweet && noSweet % 7 === 0) add('nosweet7');
      if (noSweet && noSweet % 30 === 0) add('nosweet30');
      if (noPdq && noPdq % 14 === 0) add('nopdq14');
    }
    const ym = ymOf(d);
    monthSlips[ym] = (monthSlips[ym] || 0) + sw + pq;
    for (const a of stravaRuns(S, d)) {
      monthKm[ym] = (monthKm[ym] || 0) + a.km;
      if (a.km >= 21) add('half');
    }
  }
  for (const w of Object.values(T.weeks)) if (w.perfect) add('week');
  for (const ym of Object.keys(monthSlips)) {
    const full = `${ym}-01` >= S.setup.startDate && monthEnd(ym) < today;
    if (full && monthSlips[ym] === 0) add('clean');
  }
  for (const km of Object.values(monthKm)) {
    if (km >= 50) add('km50');
    if (km >= 100) add('km100');
  }
  if (tot.km >= 500) add('km500');
  if (tot.km >= 1000) add('km1000');
  if (tot.runs + tot.gym >= 50) add('train50');
  if (tot.runs + tot.gym >= 150) add('train150');
  if (tot.shoes >= 1) add('shoe1');
  if (tot.shoes >= 4) add('shoe4');
  const p = project(S);
  if (p.dayN >= 100) add('d100');
  if (p.dayN >= p.total / 2) add('d180');
  if (today >= S.setup.sixty) add('sixty');
  memo.key = k;
  memo.val = { res, total: Object.values(res).reduce((a, b) => a + b, 0) };
  return memo.val;
}

