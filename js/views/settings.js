// Tela "Ajustes": metas, valores, Strava (passo a passo), nuvem, padrinho e backup.
import { brl, esc, num, todayISO, ymOf, addMonths, monthLabel, clone } from '../utils.js';
import { monthValues, rulesFor } from '../engine.js';
import { VERSION } from '../rules.js';
import * as Strava from '../strava.js';
import * as Cloud from '../cloud.js';
import { toast } from '../fx.js';
import { topBar } from './today.js';

export const appUrl = () => location.origin + location.pathname;
export const padrinhoUrl = (S) => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}padrinho.html?p=${S.share.id}`;

function rulesSection(app) {
  const S = app.S;
  const ym = ymOf(todayISO());
  const { values, rules: r } = monthValues(S, ym);
  const next = addMonths(ym, 1);
  const nr = rulesFor(S, next);
  const changed = JSON.stringify(nr) !== JSON.stringify(r);
  return `<h3>Regras de ${monthLabel(ym)}</h3>
  <div class="vtable">
    ${r.train.map((h) => `<div><span>${h.emoji} ${esc(h.name)} <small>${h.perWeek}× por semana</small></span><b>+${brl(values[h.id])}</b></div>`).join('')}
    ${r.meals.map((h) => `<div><span>${h.emoji} ${esc(h.name)} na dieta</span><b>+${brl(values[h.id])}</b></div>`).join('')}
    ${(r.extras || []).map((h) => `<div><span>${h.emoji} ${esc(h.name)} <small>extra</small></span><b>+${brl(h.value)}</b></div>`).join('')}
    ${r.slips.map((h) => `<div><span>${h.emoji} ${esc(h.name)}</span><b class="neg">−${brl(h.value)}</b></div>`).join('')}
    <div><span>🔥 ${r.bonuses.streak.every} dias seguidos na dieta</span><b>+${brl(r.bonuses.streak.value)}</b></div>
    <div><span>🏁 Semana perfeita de treinos</span><b>+${brl(r.bonuses.perfectWeek)}</b></div>
    <div><span>🃏 Coringas por mês</span><b>${r.bonuses.jokers}</b></div>
  </div>
  <p class="hint">Mês perfeito: ${brl(r.pool)} no cofre, mais os bônus. Os valores se ajustam ao tamanho de cada mês.</p>
  <h3>Metas semanais <small>valem a partir de ${monthLabel(next)}</small></h3>
  ${nr.train.map((h) => `<div class="goal-ed"><span>${h.emoji} ${esc(h.name)}</span><span class="step"><button data-act="rule-week" data-id="${h.id}" data-d="-1" ${h.perWeek > 1 ? '' : 'disabled'}>−</button><b>${h.perWeek}×</b><button class="plus" data-act="rule-week" data-id="${h.id}" data-d="1" ${h.perWeek < 7 ? '' : 'disabled'}>+</button></span></div>`).join('')}
  <p class="hint">${changed ? '✅ Mudança agendada para o mês que vem.' : 'Mudanças entram no mês seguinte, para não ter tentação. 😉'}</p>`;
}

function copyRow(label, value) {
  return `<div class="copy-row"><span><small>${esc(label)}</small><b>${esc(value)}</b></span><button class="btn small ghost" data-act="copy" data-v="${esc(value)}">Copiar</button></div>`;
}

function stravaSection(app) {
  const st = app.S.strava || {};
  if (st.token) {
    const acts = Object.values(st.acts || {}).flat();
    const km = acts.reduce((a, x) => a + (x.km || 0), 0);
    const last = st.lastSync ? new Date(st.lastSync).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    return `<div class="strava-ok"><span class="sv-logo">S</span><div><b>${esc(st.athlete || 'Conectado')}</b><small>Última sincronização: ${last}<br>${acts.length} atividades · ${num(km)} km</small></div></div>
    <p class="hint">As atividades do Garmin chegam pelo Strava. Quando aparecer uma nova, o app sugere registrar com um toque na tela Hoje.</p>
    <button class="btn ghost block" data-act="st-sync">🔄 Buscar atividades agora</button>
    <button class="btn ghost block danger" data-act="st-off">Desconectar Strava</button>`;
  }
  const host = location.hostname;
  const step = app.ui.stStep || 1;
  const steps = [
    `<b>1. Abra a página de API do Strava</b><p>Entre com a sua conta do Strava (a mesma do Garmin). É grátis, não precisa do premium.</p>
     <a class="btn strava block" href="https://www.strava.com/settings/api" target="_blank" rel="noopener">Abrir strava.com/settings/api ↗</a>`,
    `<b>2. Preencha o formulário "Meu aplicativo de API"</b><p>Copie cada campo daqui e cole lá:</p>
     ${copyRow('Nome do aplicativo', 'Andre360')}
     ${copyRow('Categoria', 'Treinamento (Training)')}
     ${copyRow('Site', appUrl())}
     ${copyRow('Domínio de retorno de chamada da autorização', host)}
     <p class="hint">Marque que leu os termos e toque em <b>Criar</b>. Se pedir um ícone, use este: <a href="icons/icon-512.png" download="andre360.png">baixar ícone</a>.</p>`,
    `<b>3. Copie o "ID do cliente" e o "Segredo do cliente"</b><p>Aparecem na mesma página, depois de criar. No segredo, toque em <i>mostrar</i> antes de copiar.</p>
     <label class="fl"><span>ID do cliente (Client ID)</span><input data-in="st-cfg" data-k="clientId" inputmode="numeric" value="${esc(st.clientId || '')}" placeholder="123456"></label>
     <label class="fl"><span>Segredo do cliente (Client Secret)</span><input data-in="st-cfg" data-k="clientSecret" value="${esc(st.clientSecret || '')}" placeholder="a1b2c3…"></label>`,
    `<b>4. Autorize</b><p>O Strava vai perguntar se o Andre360 pode ver suas atividades. Deixe tudo marcado e toque em <b>Autorizar</b>.</p>
     <button class="btn strava block big" data-act="st-connect">Conectar com Strava</button>
     <details class="more"><summary>Voltou para o navegador em vez do app?</summary><p class="hint">Copie o código que apareceu e cole aqui:</p><div class="ed-row"><input id="st-code" placeholder="Código do Strava"><button class="btn small" data-act="st-code">Usar</button></div></details>`,
  ];
  return `<p class="hint">Uns 5 minutos, uma vez só. Os treinos do relógio passam a aparecer aqui sozinhos.</p>
  <div class="wizard"><div class="wz-dots">${steps.map((_, i) => `<i class="${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}"></i>`).join('')}</div>
  <div class="wz-step">${steps[step - 1]}</div>
  <div class="row">${step > 1 ? '<button class="btn ghost small" data-act="st-step" data-d="-1">‹ Voltar</button>' : '<span></span>'}${step < steps.length ? '<button class="btn primary small" data-act="st-step" data-d="1">Próximo ›</button>' : ''}</div></div>`;
}

function padrinhoSection(app) {
  const cs = Cloud.getStatus();
  if (!cs.signedIn) return `<p class="hint">Crie sua conta na nuvem (acima) para liberar o link do padrinho.</p>`;
  return `<p class="hint">Mande este link para o Raphael acompanhar seu progresso e mandar recados. Ele só vê o resumo: o cofre, a semana e as conquistas.</p>
  <div class="code-box small">${esc(padrinhoUrl(app.S))}</div>
  <button class="btn primary block" data-act="share-link">Enviar link 📲</button>`;
}

export function renderSettings(app) {
  return `${topBar(app.S)}
  <section class="card">${rulesSection(app)}</section>
  <section class="card" id="strava"><h3><span class="sv-logo sm">S</span> Strava e Garmin</h3>${stravaSection(app)}</section>
  <section class="card"><h3>☁️ Nuvem</h3>${app.cloudSetupHtml()}</section>
  <section class="card"><h3>📣 Padrinho</h3>${padrinhoSection(app)}</section>
  <section class="card"><h3>💾 Cópia de segurança</h3><p class="hint">Um arquivo com todos os seus dados, para guardar ou passar para outro celular.</p>
    <div class="row"><button class="btn ghost small" data-act="backup">Baixar cópia</button><label class="btn ghost small file">Restaurar<input type="file" accept="application/json,.json" data-in="restore" hidden></label></div></section>
  <p class="hint center ver">Andre360 v${VERSION} · feito pelo Raphael para o André 👟</p>`;
}

export const settingsActions = {
  'rule-week'(app, el) {
    const next = addMonths(ymOf(todayISO()), 1);
    app.commit((S) => {
      if (!S.rules[next]) S.rules[next] = clone(rulesFor(S, next));
      const h = S.rules[next].train.find((x) => x.id === el.dataset.id);
      h.perWeek = Math.max(1, Math.min(7, h.perWeek + Number(el.dataset.d)));
    });
  },
  async copy(app, el) {
    try {
      await navigator.clipboard.writeText(el.dataset.v);
      toast('Copiado!');
    } catch (e) {
      toast('Segure o texto para copiar.');
    }
  },
  'st-step'(app, el) {
    app.ui.stStep = Math.max(1, Math.min(4, (app.ui.stStep || 1) + Number(el.dataset.d)));
    if (app.ui.stStep === 4) {
      const st = app.S.strava || {};
      if (!st.clientId || !st.clientSecret) {
        app.ui.stStep = 3;
        toast('Cole o ID e o segredo do cliente primeiro.', { kind: 'bad' });
      }
    }
    app.render();
    document.getElementById('strava')?.scrollIntoView({ block: 'start' });
  },
  'st-connect'(app) {
    const st = app.S.strava || {};
    if (!st.clientId || !st.clientSecret) return toast('Faltam o ID e o segredo do cliente (passo 3).', { kind: 'bad' });
    Strava.startAuth(app.S);
  },
  async 'st-code'(app) {
    const code = document.getElementById('st-code').value.trim();
    if (!code) return;
    await app.stravaExchange(code);
  },
  async 'st-sync'(app) {
    await app.stravaSync(true);
  },
  'st-off'(app) {
    if (!confirm('Desconectar o Strava? Os treinos já registrados continuam.')) return;
    app.commit((S) => Strava.disconnect(S));
  },
  async 'share-link'(app) {
    const url = padrinhoUrl(app.S);
    const text = 'Acompanha meu projeto 360 rumo aos 60! 👟';
    try {
      if (navigator.share) await navigator.share({ title: 'Andre360', text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copiado!');
      }
    } catch (e) { /* cancelado */ }
  },
  backup(app) {
    const blob = new Blob([JSON.stringify(app.S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `andre360-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
};

export const settingsInputs = {
  'st-cfg'(app, el) {
    app.S.strava = app.S.strava || {};
    app.S.strava[el.dataset.k] = el.value.trim();
    app.saveQuiet();
  },
  restore(app, el) {
    const f = el.files && el.files[0];
    if (!f) return;
    f.text().then((t) => {
      try {
        const data = JSON.parse(t);
        if (!data.setup || !data.days) throw new Error('Arquivo não parece uma cópia do Andre360.');
        if (!confirm('Substituir os dados deste celular pela cópia?')) return;
        app.replaceState(data);
        toast('✅ Cópia restaurada.');
      } catch (e) {
        toast(esc(e.message), { kind: 'bad' });
      }
    });
  },
};
