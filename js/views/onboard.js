// Primeira abertura: boas-vindas, regras em 30 segundos e o primeiro tênis.
import { brl, diffDays, todayISO, esc } from '../utils.js';
import { SIXTY, DEFAULT_RULES } from '../rules.js';
import { computeValues } from '../engine.js';
import { startState } from '../store.js';
import * as Cloud from '../cloud.js';
import { shoe } from './ui.js';
import { goalForm, readGoal } from './tenis.js';
import { confetti, toast } from '../fx.js';

export function renderOnboarding() {
  const t = todayISO();
  const v = computeValues(DEFAULT_RULES, t.slice(0, 7)).values;
  const r = DEFAULT_RULES;
  const cs = Cloud.getStatus();
  return `<div class="onb">
    <div class="onb-hero">
      <span class="wm big">ANDRE<em>360</em></span>
      ${shoe(0.62, { cls: 'hero-shoe float', label: 'Tênis' })}
      <p class="lead">Faltam <b>${diffDays(t, SIXTY)} dias</b> para os 60. Cada dia de treino e dieta vira dinheiro no <b>Cofre do Tênis</b>.</p>
    </div>
    <section class="card rules-mini">
      <h3>Como funciona</h3>
      <div class="vtable">
        <div><span>🏃 Corrida · ${r.train[0].perWeek}× na semana</span><b class="pos">+${brl(v.run)}</b></div>
        <div><span>🏋️ Academia · ${r.train[1].perWeek}× na semana</span><b class="pos">+${brl(v.gym)}</b></div>
        <div><span>🥗 Almoço na dieta</span><b class="pos">+${brl(v.lunch)}</b></div>
        <div><span>🍽️ Jantar na dieta</span><b class="pos">+${brl(v.dinner)}</b></div>
        ${r.extras.map((h) => `<div><span>${h.emoji} ${h.name}</span><b class="pos">+${brl(h.value)}</b></div>`).join('')}
        <div><span>🍫 Doce</span><b class="neg">−${brl(r.slips[0].value)}</b></div>
        <div><span>🧀 Pão de queijo</span><b class="neg">−${brl(r.slips[1].value)}</b></div>
      </div>
      <p class="hint">Treina em qualquer dia da semana. Mês perfeito: <b>${brl(r.pool)}</b> no cofre, fora os bônus de sequência e de semana perfeita. Encheu o cofre, o tênis está liberado. 👟</p>
    </section>
    <section class="card"><h3>Qual é o primeiro tênis?</h3>${goalForm({}, 'onb-start')}</section>
    ${cs.configured ? '<button class="link block-link" data-act="fb-login-restore">Já usa o Andre360 em outro celular? Entrar</button>' : ''}
  </div>`;
}

export const onboardActions = {
  'onb-start'(app) {
    try {
      const goal = readGoal();
      app.replaceState(startState({ goal }));
      app.go('hoje');
      confetti({ count: 120 });
      toast(`👟 Projeto iniciado! Bora pelo <b>${esc(goal.name)}</b>.`, { kind: 'good', ms: 4500 });
    } catch (e) {
      toast(esc(e.message), { kind: 'bad' });
    }
  },
  'fb-login-restore'(app) {
    app.ui.loginMode = 'in';
    app.openLogin();
  },
};
