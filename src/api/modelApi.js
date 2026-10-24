/*
 * API страницы «Настройка модели».
 *
 * Пока бэкенда нет, функции работают на моке: настройки лежат в localStorage,
 * а превью считается на детерминированной выборке из 116 клиентов.
 * Когда появятся эндпоинты, замените тела функций на запросы через apiClient —
 * сигнатуры и формат ответов менять не нужно.
 */

export const MAX_WEIGHT = 50;

const STORAGE_KEY = 'riskflow:model-config';
const DELAY = { load: 250, save: 350, preview: 120 };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Список признаков «приходит с сервера»: новый признак в коде появляется на странице сам. */
const FEATURES = [
  {
    id: 'autoRenewOff',
    title: 'Автопродление выключено',
    description: 'Услуга скоро истекает, а автосписание отключено',
    enabled: true,
    weight: 30,
  },
  {
    id: 'lowFunds',
    title: 'Недостаточно средств',
    description: 'Баланс и доступные бонусы меньше стоимости ближайших продлений',
    enabled: true,
    weight: 25,
  },
  {
    id: 'prolongWait',
    title: 'Статус prolong_wait',
    description: 'Ожидает оплаты; через 5 дней услуга будет удалена',
    enabled: true,
    weight: 20,
  },
  {
    id: 'expiresSoon',
    title: 'Близкое истечение',
    description: 'До окончания услуги осталось ≤ 7 дней',
    enabled: true,
    weight: 15,
  },
  {
    id: 'notPerformed',
    title: 'Невыполненные транзакции',
    description: 'Заказы созданы, но не оплачены (not_performed)',
    enabled: true,
    weight: 5,
  },
  {
    id: 'bonusBlocked',
    title: 'Бонусы недоступны',
    description: 'bonusState запрещает тратить бонусный баланс',
    enabled: false,
    weight: 5,
  },
];

const DEFAULT_THRESHOLDS = { mid: 40, high: 70 };

/* Параметры прогноза показываются на странице только для чтения. */
const PARAMS = {
  horizonDays: 14,
  moneyPeriodDays: 30,
  recalculation: 'при любом изменении',
  bonusesInCoverage: true,
};

/* ───────── хранилище ───────── */
let memoryStore = null; // запасной вариант, если localStorage недоступен

function readStored() {
  if (memoryStore) return memoryStore;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStored(value) {
  memoryStore = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* приватный режим: настройки живут до перезагрузки страницы */
  }
}

/* ───────── конфиг ───────── */
const clampWeight = (value) =>
  Math.min(MAX_WEIGHT, Math.max(0, Math.round(Number(value) || 0)));

const thresholdsAreValid = ({ mid, high } = {}) =>
  Number.isInteger(mid) && Number.isInteger(high) && mid >= 0 && high <= 100 && mid < high;

/* Приводит конфиг к известным признакам: лишнее отбрасывает, недостающее берёт по умолчанию. */
function normalize(config) {
  const byId = new Map((config?.features ?? []).map((f) => [f.id, f]));
  return {
    features: FEATURES.map((base) => {
      const item = byId.get(base.id);
      return item
        ? { ...base, enabled: Boolean(item.enabled), weight: clampWeight(item.weight) }
        : { ...base };
    }),
    thresholds: thresholdsAreValid(config?.thresholds)
      ? { mid: config.thresholds.mid, high: config.thresholds.high }
      : { ...DEFAULT_THRESHOLDS },
  };
}

const toStored = (config) => ({
  features: config.features.map(({ id, enabled, weight }) => ({ id, enabled, weight })),
  thresholds: config.thresholds,
});

export async function loadModelConfig() {
  await wait(DELAY.load);
  return {
    config: normalize(readStored()),
    params: { ...PARAMS },
  };
}

export async function saveModelConfig(config) {
  await wait(DELAY.save);
  if (!thresholdsAreValid(config.thresholds)) {
    throw new Error('Порог «средний» должен быть меньше «высокого»');
  }
  const next = normalize(config);
  writeStored(toStored(next));
  return next;
}

/* ───────── мок расчёта: превью «что изменится» ───────── */
const levelOf = (score, { mid, high }) => (score >= high ? 'high' : score >= mid ? 'mid' : 'low');

/* Вероятность оттока по уровню риска. */
const CHURN = { high: 0.7, mid: 0.35, low: 0.1 };

/* risk-score = нормировка 0–100 от Σ (вес признака × сила сигнала). Без признаков оценки нет. */
function scoreOf(strengths, features) {
  let sum = 0;
  let max = 0;
  for (const feature of features) {
    if (!feature.enabled) continue;
    sum += feature.weight * (strengths[feature.id] ?? 0);
    max += feature.weight;
  }
  return max > 0 ? Math.round((sum / max) * 100) : null;
}

/*
 * Выборка клиентов с оценкой. При весах по умолчанию распределение
 * 18 / 37 / 61 — как на странице «Клиенты».
 */
function buildPopulation() {
  const plan = [
    { count: 18, min: 70, max: 99 },
    { count: 37, min: 40, max: 69 },
    { count: 61, min: 5, max: 39 },
  ];
  const base = FEATURES.filter((f) => f.enabled);
  const baseMax = base.reduce((sum, f) => sum + f.weight, 0);

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const people = [];
  for (const { count, min, max } of plan) {
    for (let i = 0; i < count; i++) {
      const target = Math.round(min + rnd() * (max - min));
      const raw = Object.fromEntries(FEATURES.map((f) => [f.id, 0.25 + rnd() * 0.75]));

      // подбираем общий множитель так, чтобы при весах по умолчанию score совпал с target
      const goal = (target / 100) * baseMax;
      let lo = 0;
      let hi = 4;
      for (let step = 0; step < 40; step++) {
        const k = (lo + hi) / 2;
        const got = base.reduce((sum, f) => sum + f.weight * Math.min(1, raw[f.id] * k), 0);
        if (got < goal) lo = k;
        else hi = k;
      }
      const strengths = Object.fromEntries(
        FEATURES.map((f) => [f.id, Math.min(1, raw[f.id] * hi)]),
      );

      const price = 30 + rnd() * 250; // цена услуг за горизонт прогноза
      const funds = price * (1 - strengths.lowFunds) * 0.9 * rnd(); // чем сильнее «не хватает средств», тем меньше денег
      people.push({ strengths, price, funds });
    }
  }
  return people;
}

const POPULATION = buildPopulation();

function evaluate(config) {
  const counts = { high: 0, mid: 0, low: 0 };
  let loss = 0;
  for (const person of POPULATION) {
    const score = scoreOf(person.strengths, config.features);
    if (score === null) continue;
    const level = levelOf(score, config.thresholds);
    counts[level] += 1;
    // потери = цена за горизонт × вероятность оттока − средства, которых хватит на продление
    loss += Math.max(0, person.price * CHURN[level] - person.funds);
  }
  return { counts, loss };
}

/* Калибровка: при настройках по умолчанию потери равны 14 380 €, как в сайдбаре. */
const MONEY_SCALE =
  14380 / evaluate(normalize({ features: FEATURES, thresholds: DEFAULT_THRESHOLDS })).loss;

const toMoney = (raw) => Math.round((raw * MONEY_SCALE) / 10) * 10;

/**
 * Сравнивает сохранённые настройки с черновиком.
 * @returns {{ levels: Record<'high'|'mid'|'low', {current: number, next: number}>,
 *             loss: {current: number, next: number} }}
 */
export async function fetchModelPreview({ current, draft }) {
  await wait(DELAY.preview);
  const before = evaluate(current);
  const after = evaluate(draft);
  return {
    levels: {
      high: { current: before.counts.high, next: after.counts.high },
      mid: { current: before.counts.mid, next: after.counts.mid },
      low: { current: before.counts.low, next: after.counts.low },
    },
    loss: { current: toMoney(before.loss), next: toMoney(after.loss) },
  };
}
