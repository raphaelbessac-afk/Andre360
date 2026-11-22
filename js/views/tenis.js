// Tela "Tênis": o cofre, o tênis da vez e a sapateira de conquistas.
import { brl, esc, fmtDateLong, todayISO } from '../utils.js';
import { wallet } from '../engine.js';
import { shoe } from './ui.js';
import { cofreHero, topBar } from './today.js';
import { confetti, toast } from '../fx.js';

export function goalForm(g = {}, act = 'goal-save') {
  return `<div class="form">
    <label class="fl"><span>Qual tênis?</span><input id="g-name" placeholder="Ex.: tênis de placa de carbono" value="${esc(g.name || '')}" maxlength="60"></label>
    <label class="fl"><span>Preço (R$)</span><input id="g-price" type="number" inputmode="decimal" min="50" step="10" placeholder="900" value="${g.price || ''}"></label>
    <label class="fl"><span>Link da loja (opcional)</span><input id="g-url" type="url" inputmode="url" placeholder="https://" value="${esc(g.url || '')}"></label>
  </div>
  <button class="btn primary block big" data-act="${act}">Salvar tênis</button>`;
}

export function readGoal() {
  const name = document.getElementById('g-name').value.trim();
  const price = Number(String(document.getElementById('g-price').value).replace(',', '.'));
  const url = document.getElementById('g-url').value.trim();
  if (!name) throw new Error('Dê um nome para o tênis.');
  if (!(price >= 50)) throw new Error('Coloque o preço do tênis (pelo menos R$ 50).');
  return { name: name.slice(0, 60), price: Math.round(price * 100) / 100, url: /^https?:\/\//.test(url) ? url : '' };
}

export function renderTenis(app) {
  const S = app.S;
  const w = wallet(S);
  const g = S.goal;
  const shoes = S.shoes || [];
  return `${topBar(S)}
  ${cofreHero(S, { compact: true })}
  <section class="card">
    ${w.ready
      ? `<div class="unlock"><b>👟 Compra liberada!</b><p>O cofre tem ${brl(w.balance)}. Comprou o <b>${esc(g.name)}</b>? Registre para ele entrar na sapateira. O valor sai do cofre.</p>
         <button class="btn primary block big" data-act="buy">Comprei! 🎉</button></div>`
      : g
        ? `<div class="stats3"><div><small>No cofre</small><b>${brl(w.balance)}</b></div><div><small>Faltam</small><b>${brl(w.missing)}</b></div><div><small>Ritmo</small><b>${w.pace > 0 ? `${brl(w.pace)}/dia` : '—'}</b></div></div>
           <p class="hint">${w.eta ? `No ritmo dos últimos dias, o tênis sai em <b>${w.eta} dias</b>${w.eta <= 7 ? ', tá quase! 🔥' : '.'}` : 'Marque refeições e treinos para o cofre começar a encher.'}</p>`
        : ''}
    ${g ? `<div class="row wrap">${g.url ? `<a class="btn ghost small" href="${esc(g.url)}" target="_blank" rel="noopener">Ver na loja ↗</a>` : ''}<button class="btn ghost small" data-act="goal-edit">Trocar tênis</button></div>` : '<button class="btn primary block" data-act="goal-edit">Escolher o próximo tênis</button>'}
  </section>
  <h2 class="sec">Sapateira <small>${shoes.length} conquistado${shoes.length === 1 ? '' : 's'}</small></h2>
  ${shoes.length
    ? `<div class="rack">${shoes
        .map((s, i) => `<div class="rack-item">${shoe(1, { cls: `mini c${i % 4}`, label: s.name })}<b>${esc(s.name)}</b><small>${brl(s.price)} · ${fmtDateLong(s.date)}</small></div>`)
        .join('')}</div>`
    : `<section class="card empty"><div class="rack-empty">${shoe(0, { cls: 'mini', label: 'Sapateira vazia' })}</div><p class="hint center">Aqui ficam os tênis conquistados com saúde. O primeiro já está a caminho.</p></section>`}
  <p class="hint center">Ganhou, vai pro cofre. Doce e pão de queijo tiram do cofre. Ao resgatar, o valor do tênis sai do cofre e o resto continua lá.</p>`;
}

export const tenisActions = {
  'goal-edit'(app) {
    app.openSheet(() => `<div class="sheet-head"><h2>👟 Próximo tênis</h2></div><p class="hint">O cofre continua com o que já tem. Só muda a meta.</p>${goalForm(app.S.goal || {})}`);
  },
  'goal-save'(app) {
    try {
      const g = readGoal();
      app.closeSheet();
      app.commit((S) => (S.goal = g));
      toast('👟 Meta salva. Bora encher o cofre!');
    } catch (e) {
      toast(esc(e.message), { kind: 'bad' });
    }
  },
  buy(app) {
    const S = app.S;
    const w = wallet(S);
    if (!w.ready) return;
    const g = S.goal;
    app.commit((s) => {
      s.shoes = s.shoes || [];
      s.shoes.push({ name: g.name, price: g.price, date: todayISO() });
      s.goal = null;
    });
    confetti();
    app.openSheet(
      () => `<div class="closing"><div class="podium">${shoe(1, { cls: 'hero-shoe', label: g.name })}</div><small class="eyebrow">Conquista #${app.S.shoes.length}</small>
      <h2>${esc(g.name)}</h2><p class="lead">Comprado com suor, almoço na dieta e muito "não" para o doce. Aproveita, André! 🏃💨</p>
      <p class="hint">Agora escolha o próximo tênis para o cofre continuar enchendo.</p>${goalForm({})}`
    );
  },
};
