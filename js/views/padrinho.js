// Página do padrinho: acompanha o André pelo link e manda recados. Só leitura.
import { brl, esc, num, diffDays, todayISO, WD_LETTER, weekday } from '../utils.js';
import { CHEERS } from '../rules.js';
import { shoe, eyelets, sole } from './ui.js';
import * as Cloud from '../cloud.js';
import { toast, confetti } from '../fx.js';

const NAME_KEY = 'andre360:padrinho-nome';
const st = { data: undefined, cheers: [], err: '' };

export function startPadrinho(shareId, render) {
  Cloud.watchPublic(shareId, {
    onData: (d) => {
      st.data = d;
      render();
    },
    onCheers: (c) => {
      st.cheers = c;
      render();
    },
    onError: (e) => {
      st.err = e;
      render();
    },
  }).catch((e) => {
    st.err = e.message;
    render();
  });
}

export function renderPadrinho() {
  const d = st.data;
  if (st.err && !d) return `<div class="onb"><div class="onb-hero"><span class="wm big">ANDRE<em>360</em></span><p class="lead">Não consegui abrir: ${esc(st.err)}</p></div></div>`;
  if (d === undefined) return `<div class="onb"><div class="onb-hero"><span class="wm big">ANDRE<em>360</em></span>${shoe(0.3, { cls: 'hero-shoe float' })}<p class="lead">Carregando…</p></div></div>`;
  if (d === null) return `<div class="onb"><div class="onb-hero"><span class="wm big">ANDRE<em>360</em></span><p class="lead">Este link ainda não tem dados. Peça para o André abrir o app conectado à nuvem.</p></div></div>`;
  const toSixty = diffDays(todayISO(), d.sixty);
  const pct = d.goal && d.goal.price ? Math.max(0, Math.min(1, d.cofre / d.goal.price)) : 0;
  let name = '';
  try {
    name = localStorage.getItem(NAME_KEY) || '';
  } catch (e) { /* ignora */ }
  const upd = new Date(d.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `<div class="pad">
  <header class="top"><div class="brand"><span class="wm">ANDRE<em>360</em></span></div><span class="pill cake">👀 modo padrinho</span></header>
  <section class="hero">
    <div class="hero-label">Cofre do Tênis do ${esc(d.name)}</div>
    <div class="hero-amount">${brl(d.cofre)}</div>
    ${shoe(pct, { cls: 'hero-shoe' })}
    ${d.goal ? `<div class="hero-goal"><span class="goal-name">${esc(d.goal.name)}</span><span>${Math.round(pct * 100)}% · ${brl(d.goal.price)}</span></div>` : ''}
    <div class="hero-sub">🎂 ${toSixty > 0 ? `faltam <b>${toSixty}</b> dias para os 60` : '<b>60 anos!</b>'} · dia ${d.dayN} do projeto</div>
  </section>
  <section class="card"><h3>Esta semana</h3>
    ${(d.week || []).map((g) => `<div class="goal-ed"><span>${g.emoji} ${esc(g.name)}</span><span>${eyelets(Math.min(g.count, 9), g.target)} <b>${Math.min(g.done, g.target)}/${g.target}</b></span></div>`).join('')}
    <div class="strip">${(d.last14 || []).map((x) => `<span class="s ${x.s}"><i>${WD_LETTER[weekday(x.d)]}</i></span>`).join('')}</div>
    <p class="hint">Verde: dia na dieta · amarelo: parcial · vermelho: deslize. 🔥 Sequência atual: <b>${d.streak}</b> dia${d.streak === 1 ? '' : 's'}.</p>
  </section>
  <section class="card"><div class="grid4">
    <div><b>${num(d.kmMonth || 0)}</b><small>km no mês</small></div>
    <div><b>${num(d.km || 0)}</b><small>km no projeto</small></div>
    <div><b>${d.medals || 0}</b><small>conquistas</small></div>
    <div><b>${(d.shoes || []).length}</b><small>tênis</small></div>
  </div>${d.lastMedal ? `<p class="hint">Última conquista: <b>${esc(d.lastMedal)}</b></p>` : ''}${sole(d.projPct || 0)}</section>
  <section class="card"><h3>Mandar um recado</h3>
    <label class="fl"><span>Seu nome</span><input id="pd-name" value="${esc(name)}" placeholder="Raphael" maxlength="30"></label>
    <div class="cheer-grid">${CHEERS.map((c, i) => `<button class="cheer-b" data-act="pd-cheer" data-i="${i}"><span>${c.emoji}</span>${esc(c.msg)}</button>`).join('')}</div>
    <div class="ed-row"><input id="pd-msg" maxlength="140" placeholder="Ou escreva o seu…"><button class="btn small primary" data-act="pd-send">Enviar</button></div>
  </section>
  ${st.cheers.length ? `<section class="card"><h3>Recados enviados</h3>${st.cheers.slice(0, 8).map((c) => `<div class="cheer"><span class="ce">${esc(c.emoji)}</span><div><b>${esc(c.msg)}</b><small>${esc(c.from)} · ${new Date(c.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></div>`).join('')}</section>` : ''}
  <p class="hint center">Atualizado ${upd}</p></div>`;
}

async function send(shareId, payload) {
  const from = document.getElementById('pd-name').value.trim() || 'Padrinho';
  try {
    localStorage.setItem(NAME_KEY, from);
  } catch (e) { /* ignora */ }
  try {
    await Cloud.sendCheer(shareId, { from, ...payload });
    toast('📣 Recado enviado!', { kind: 'good' });
    confetti({ count: 60, coins: false });
  } catch (e) {
    toast(esc(e.message), { kind: 'bad' });
  }
}

export const padrinhoActions = {
  'pd-cheer'(app, el) {
    send(app.shareId, CHEERS[Number(el.dataset.i)]);
  },
  'pd-send'(app) {
    const msg = document.getElementById('pd-msg').value.trim();
    if (!msg) return;
    send(app.shareId, { emoji: '💬', msg });
  },
};
