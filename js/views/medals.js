// Tela "Conquistas": medalhas e números do projeto 360.
import { esc, num, brl } from '../utils.js';
import { MEDALS, computeMedals } from '../medals.js';
import { totals, project, wallet } from '../engine.js';
import { topBar } from './today.js';
import { sole } from './ui.js';

export function renderMedals(app) {
  const S = app.S;
  const { res, total } = computeMedals(S);
  const t = totals(S);
  const p = project(S);
  const w = wallet(S);
  const got = MEDALS.filter((m) => res[m.id]).length;
  return `${topBar(S)}
  <section class="card proj-card">
    <h3>Projeto 360 <small>rumo aos 60</small></h3>
    <div class="big-n"><b>${p.dayN}</b><span>de ${p.total} dias</span></div>
    ${sole(p.pct)}
    <div class="grid4">
      <div><b>${num(t.km)}</b><small>km corridos</small></div>
      <div><b>${t.runs}</b><small>corridas</small></div>
      <div><b>${t.gym}</b><small>academias</small></div>
      <div><b>${t.meals}</b><small>refeições na dieta</small></div>
      <div><b>${t.best}</b><small>melhor sequência</small></div>
      <div><b>${t.slips}</b><small>deslizes</small></div>
      <div><b>${t.shoes}</b><small>tênis conquistados</small></div>
      <div><b>${brl(w.balance + w.spent).replace(',00', '')}</b><small>ganho no total</small></div>
    </div>
  </section>
  <h2 class="sec">Conquistas <small>${got} de ${MEDALS.length} · ${total} no total</small></h2>
  <div class="medals">${MEDALS.map((m) => {
    const n = res[m.id] || 0;
    return `<div class="medal ${n ? 'on' : ''}" style="--mc:${m.color}"><span class="me">${m.emoji}</span>${n > 1 ? `<span class="mx">×${n}</span>` : ''}<b>${esc(m.name)}</b><small>${esc(m.desc)}</small></div>`;
  }).join('')}</div>`;
}
