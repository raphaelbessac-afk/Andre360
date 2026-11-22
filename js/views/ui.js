// Peças visuais reutilizadas: o tênis que enche, ilhoses de cadarço, solado.
import { esc } from '../utils.js';

let n = 0;

const UPPER = 'M20 86 L17 52 C16 40 21 31 29 28 L33 18 C35 15 39 15 40 18 L43 27 C53 29 61 34 67 41 C75 50 86 52 98 49 L114 45 C142 47 172 57 198 66 C216 72 230 74 235 80 C237 84 234 87 228 87 Z';
const SOLE = 'M11 84 L235 80 C239 87 234 96 222 97 L36 105 C19 106 9 98 11 84 Z';

// Tênis de perfil que vai "enchendo" do calcanhar até a ponta conforme pct (0 a 1).
export function shoe(pct = 0, { cls = '', label = '' } = {}) {
  const id = `sh${++n}`;
  const w = Math.max(0, Math.min(1, pct)) * 240;
  return `<svg class="shoe ${cls}" viewBox="0 0 240 118" role="img" aria-label="${esc(label)}">
    <defs>
      <linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#FF5A1F"/><stop offset=".38" stop-color="#FF3D8B"/><stop offset=".7" stop-color="#22D3EE"/><stop offset="1" stop-color="#D4FF3A"/>
      </linearGradient>
      <pattern id="${id}k" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="transparent"/><rect width="2" height="6" fill="rgba(255,255,255,.07)"/>
      </pattern>
      <clipPath id="${id}c"><rect x="0" y="0" width="${w.toFixed(1)}" height="118"/></clipPath>
    </defs>
    <g class="shoe-empty">
      <path d="${UPPER}" fill="#1B1E24" stroke="#343944" stroke-width="2"/>
      <path d="${SOLE}" fill="#23272F" stroke="#343944" stroke-width="2"/>
    </g>
    <g clip-path="url(#${id}c)" class="shoe-fill">
      <path d="${UPPER}" fill="url(#${id}g)" opacity=".9"/>
      <path d="${UPPER}" fill="url(#${id}k)"/>
      <path d="${SOLE}" fill="#F4F6F8"/>
    </g>
    <g fill="none" stroke-linecap="round" class="shoe-lines">
      <path d="M96 56 L106 42 M108 57 L118 44 M120 59 L130 46 M132 61 L142 49" stroke="#0A0B0D" stroke-width="3.5" opacity=".55"/>
      <path d="M28 70 C60 62 90 70 120 72 M32 77 C70 70 100 78 140 78" stroke="rgba(255,255,255,.4)" stroke-width="2.2"/>
      <path d="M14 98 C40 104 120 100 228 96" stroke="#0A0B0D" stroke-width="1.6" opacity=".25"/>
    </g>
    <g class="tread" fill="#0A0B0D" opacity=".4">
      ${Array.from({ length: 15 }, (_, i) => { const x = 38 + i * 12.5; return `<rect x="${x}" y="${(104 - ((x - 36) * 8) / 186).toFixed(1)}" width="7" height="4" rx="1.5"/>`; }).join('')}
    </g>
  </svg>`;
}

// Ilhoses (furos do cadarço) para a meta semanal: cheios = feitos.
export function eyelets(done, target, cls = '') {
  const out = [];
  const tot = Math.max(target, done);
  for (let i = 0; i < tot; i++) out.push(`<i class="eye ${i < done ? 'on' : ''} ${i >= target ? 'bonus' : ''} ${cls}"></i>`);
  return `<span class="eyes">${out.join('')}</span>`;
}

// Faixa do "solado" usada como barra de progresso.
export function sole(pct, cls = '') {
  return `<div class="sole ${cls}"><div class="sole-fill" style="width:${(Math.max(0, Math.min(1, pct)) * 100).toFixed(1)}%"></div><div class="sole-tread"></div></div>`;
}
