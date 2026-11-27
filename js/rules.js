// Regras padrão do Andre360. Valores em reais.
// Treinos têm meta semanal (seg a dom, em qualquer dia). Refeições valem todo dia.
// O pote mensal é dividido por peso: o mês perfeito soma exatamente o pote.

export const VERSION = '1.1.0';

export const SIXTY = '2027-11-03'; // 60 anos do André
export const ATHLETE = 'André';

export const DEFAULT_RULES = {
  pool: 300,
  train: [
    { id: 'run', name: 'Corrida', emoji: '🏃', perWeek: 3, weight: 8 },
    { id: 'gym', name: 'Academia', emoji: '🏋️', perWeek: 2, weight: 8 },
  ],
  meals: [
    { id: 'lunch', name: 'Almoço', emoji: '🥗', weight: 3 },
    { id: 'dinner', name: 'Jantar', emoji: '🍽️', weight: 3 },
  ],
  slips: [
    { id: 'sweet', name: 'Doce', emoji: '🍫', value: 15 },
    { id: 'pdq', name: 'Pão de queijo', emoji: '🧀', value: 10 },
  ],
  // Extras: somam por cima do pote. countsAs = também conta como esse treino na meta da semana.
  extras: [
    { id: 'read', name: 'Ler 10 páginas', emoji: '📖', value: 5, max: 1 },
    { id: 'esfiha', name: 'Esfiha da tarde sem sobremesa', emoji: '🥟', value: 1, max: 1 },
    { id: 'rainrun', name: 'Esteira em dia de chuva', emoji: '🌧️', value: 8, max: 1, countsAs: 'run', hint: 'já conta como corrida da semana' },
  ],
  bonuses: {
    streak: { every: 7, value: 5 }, // a cada 7 dias seguidos com almoço e jantar na dieta
    perfectWeek: 10, // bateu a meta de corrida e de academia na semana
    jokers: 2, // por mês
  },
};

// Tipos de atividade do Strava (o Garmin sincroniza com o Strava).
export const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun', 'Treadmill'];
export const GYM_TYPES = ['WeightTraining', 'Workout', 'Crossfit', 'HighIntensityIntervalTraining', 'Pilates', 'Yoga', 'StairStepper', 'Elliptical', 'Rowing', 'VirtualRow'];

// Recados prontos do padrinho.
export const CHEERS = [
  { emoji: '👏', msg: 'Boa, André!' },
  { emoji: '🔥', msg: 'Tá voando!' },
  { emoji: '👟', msg: 'O tênis novo tá chegando!' },
  { emoji: '🍫', msg: 'Larga esse doce!' },
  { emoji: '🧀', msg: 'Pão de queijo não!' },
  { emoji: '🎂', msg: 'Rumo aos 60!' },
];
