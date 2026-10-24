import { useEffect, useMemo, useState } from 'react';
import './Customers.css';

/* ───────── данные ─────────
 * Замените loadCustomers() на вызов вашего customersApi.
 * Ожидаемая форма строки:
 * { id, email, balance, topped, score|null, atRisk|null,
 *   signals: { autoRenewOff, lowFunds, prolongWait, expiresSoon }, daysLeft|null }
 */
const PAGE_SIZE = 10;

const HEAD = [
  [10482, 'olga.petrova@mail.ru', 3.2, 142, 92, 1180, { autoRenewOff: 1, lowFunds: 1 }, null],
  [10317, 'dm.sokolov@yandex.ru', 0, 89.5, 87, 960, { prolongWait: 1, lowFunds: 1 }, null],
  [10655, 'anna.k@gmail.com', 11.4, 310, 81, 842, { expiresSoon: 1 }, 2],
  [10091, 'it-studio@corp.ru', 24, 1240, 74, 790, { autoRenewOff: 1 }, null],
  [10733, 'n.ivanov@mail.ru', 5.1, 47, 63, 410, { lowFunds: 1 }, null],
  [10208, 'maria.s@yandex.ru', 18, 220, 58, 355, { expiresSoon: 1 }, 5],
  [10544, 'web-agency@mail.ru', 40.5, 960, 49, 290, { autoRenewOff: 1 }, null],
  [10120, 'pavel.d@gmail.com', 120, 530, 27, 45, {}, null],
  [10871, 'k.smirnova@mail.ru', 76.3, 410, 18, 20, {}, null],
  [10999, 'new.user@proton.me', 0, 0, null, null, {}, null],
];

function buildMock() {
  let seed = 42;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const domains = ['mail.ru', 'yandex.ru', 'gmail.com', 'corp.ru', 'proton.me'];
  const names = ['ivan', 'sveta', 'oleg', 'nina', 'artem', 'lena', 'denis', 'vera', 'max', 'ira'];
  const plan = [
    ['high', 14, 70, 99],
    ['mid', 34, 40, 69],
    ['low', 59, 5, 39],
    ['none', 11, 0, 0],
  ];
  const rows = HEAD.map(([id, email, balance, topped, score, atRisk, s, daysLeft]) => ({
    id, email, balance, topped, score, atRisk, daysLeft,
    signals: { autoRenewOff: false, lowFunds: false, prolongWait: false, expiresSoon: false, ...s },
  }));
  let id = 11000;
  plan.forEach(([lvl, n, min, max]) => {
    for (let i = 0; i < n; i++) {
      id += Math.floor(rnd() * 40) + 1;
      const name = names[Math.floor(rnd() * names.length)];
      const email = `${name}${Math.floor(rnd() * 99)}@${domains[Math.floor(rnd() * domains.length)]}`;
      if (lvl === 'none') {
        rows.push({ id, email, balance: 0, topped: 0, score: null, atRisk: null, daysLeft: null,
          signals: { autoRenewOff: false, lowFunds: false, prolongWait: false, expiresSoon: false } });
        continue;
      }
      const score = Math.round(min + rnd() * (max - min));
      const signals = {
        autoRenewOff: rnd() < (lvl === 'low' ? 0.05 : 0.5),
        lowFunds: rnd() < (lvl === 'low' ? 0.05 : 0.45),
        prolongWait: rnd() < (lvl === 'high' ? 0.35 : 0.1),
        expiresSoon: rnd() < (lvl === 'low' ? 0.05 : 0.3),
      };
      rows.push({
        id, email, score, signals,
        balance: Math.round(rnd() * (lvl === 'low' ? 200 : 40) * 10) / 10,
        topped: Math.round(rnd() * 1200 * 10) / 10,
        atRisk: Math.round(score * (4 + rnd() * 8)),
        daysLeft: signals.expiresSoon ? Math.floor(rnd() * 7) + 1 : null,
      });
    }
  });
  return rows;
}

const loadCustomers = () =>
  new Promise((resolve) => setTimeout(() => resolve(buildMock()), 300));

/* ───────── хелперы ───────── */
const LEVELS = [
  { key: 'high', label: 'Высокий', dot: 'var(--danger)' },
  { key: 'mid', label: 'Средний', dot: 'var(--warn)' },
  { key: 'low', label: 'Низкий', dot: 'var(--ok)' },
  { key: 'none', label: 'Нет оценки', dot: 'var(--neutral)' },
];

const SIGNALS = [
  { key: 'autoRenewOff', label: 'автопродление выключено', accent: true },
  { key: 'lowFunds', label: 'не хватает средств' },
  { key: 'prolongWait', label: 'есть prolong_wait' },
  { key: 'expiresSoon', label: 'истекает ≤ 7 дней' },
];

const getLevel = (score) =>
  score == null ? 'none' : score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

const eur = (v) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eurInt = (v) => Math.round(v).toLocaleString('ru-RU') + ' €';

function reasonOf(c) {
  const s = c.signals;
  if (c.score == null) return 'Нет услуг — оценка недоступна';
  const parts = [];
  if (s.autoRenewOff) parts.push('Автопродление выкл.');
  if (s.prolongWait) parts.push('prolong_wait');
  if (s.lowFunds) parts.push(parts.length ? 'нет средств' : 'Недостаточно средств');
  if (s.expiresSoon) parts.push(`Истекает через ${c.daysLeft ?? '≤ 7'} дн.`);
  return parts.length ? parts.join(', ') : 'Явных сигналов риска нет';
}

const COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'email', label: 'email', sortable: true },
  { key: 'balance', label: 'баланс', sortable: true, num: true },
  { key: 'topped', label: 'пополнено', sortable: true, num: true },
  { key: 'score', label: 'risk-score', sortable: true },
  { key: 'level', label: 'уровень' },
  { key: 'reason', label: 'главная причина' },
  { key: 'atRisk', label: 'под риском', sortable: true, num: true },
];

function pagesList(page, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(total - 1, page + 1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

const SortIcon = ({ dir }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    {dir === 'desc' ? (
      <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ) : dir === 'asc' ? (
      <path d="M7 12V2M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M4.5 5.5 7 3l2.5 2.5M4.5 8.5 7 11l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

/* ───────── страница ───────── */
export default function Customers() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(null); // один уровень
  const [signals, setSignals] = useState([]); // несколько сигналов
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [updatedId, setUpdatedId] = useState(null);
  const [secAgo, setSecAgo] = useState(3);

  const load = () => {
    setError(null);
    loadCustomers().then(setRows).catch((e) => setError(e));
  };
  useEffect(load, []);

  // «live»: счётчик + подсветка недавно обновлённой строки
  useEffect(() => {
    const t = setInterval(() => setSecAgo((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (rows) setUpdatedId(10655);
    const t = setTimeout(() => setUpdatedId(null), 6000);
    return () => clearTimeout(t);
  }, [rows]);

  // фильтры, кроме уровня → для счётчиков на чипах
  const base = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter(
      (c) =>
        (!q || String(c.id).includes(q) || c.email.toLowerCase().includes(q)) &&
        signals.every((k) => c.signals[k])
    );
  }, [rows, query, signals]);

  const counts = useMemo(() => {
    const m = { high: 0, mid: 0, low: 0, none: 0 };
    base.forEach((c) => m[getLevel(c.score)]++);
    return m;
  }, [base]);

  const filtered = useMemo(() => {
    const list = level ? base.filter((c) => getLevel(c.score) === level) : base;
    const { key, dir } = sort;
    const k = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // «—» всегда в конце
      if (bv == null) return -1;
      return (av > bv ? 1 : av < bv ? -1 : 0) * k;
    });
  }, [base, level, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = !!(query || level || signals.length);

  const resetPage = (fn) => (...a) => { fn(...a); setPage(1); };

  const toggleLevel = resetPage((k) => setLevel((cur) => (cur === k ? null : k)));
  const toggleSignal = resetPage((k) =>
    setSignals((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
  );
  const reset = () => { setQuery(''); setLevel(null); setSignals([]); setPage(1); };

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  const exportCsv = () => {
    const head = ['ID', 'email', 'balance', 'topped', 'risk_score', 'level', 'reason', 'at_risk'];
    const lines = filtered.map((c) =>
      [c.id, c.email, c.balance, c.topped, c.score ?? '', getLevel(c.score), `"${reasonOf(c)}"`, c.atRisk ?? ''].join(',')
    );
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openCard = (id) => {
    // подключите роутер: navigate(`/customers/${id}`)
    window.location.assign(`/customers/${id}`);
  };

  return (
    <div className="cust">
      <header className="cust-head">
        <div className="cust-title">
          <span className="cust-watermark" aria-hidden="true">КЛИЕНТЫ</span>
          <h1>рейтинг клиентов</h1>
          <p>кому нужно внимание сейчас — отсортируйте, отфильтруйте, откройте карточку</p>
        </div>
        <div className="cust-head-actions">
          <div className="live-pill">
            <i className="live-dot" />
            <b>live</b>
            <span>обновлено {secAgo} сек назад</span>
          </div>
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={!filtered.length}>
            экспорт CSV
          </button>
        </div>
      </header>

      {/* фильтры */}
      <section className="panel filters">
        <div className="filters-top">
          <label className="search">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="m14.5 14.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              placeholder="поиск по ID или email"
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </label>
          <span className="found">найдено: {filtered.length}</span>
          <button type="button" className="btn btn-secondary" onClick={reset} disabled={!hasFilters}>
            сбросить фильтры
          </button>
        </div>

        <div className="chip-row" role="radiogroup" aria-label="Уровень риска">
          <span className="chip-label">уровень риска</span>
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              role="radio"
              aria-checked={level === l.key}
              className={`chip ${level === l.key ? 'is-selected' : ''}`}
              onClick={() => toggleLevel(l.key)}
            >
              <i style={{ background: l.dot }} />
              {l.label} · {counts[l.key]}
            </button>
          ))}
        </div>

        <div className="chip-row" role="group" aria-label="Сигналы">
          <span className="chip-label">сигналы</span>
          {SIGNALS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={signals.includes(s.key)}
              className={`chip chip-signal ${signals.includes(s.key) ? 'is-active' : ''}`}
              onClick={() => toggleSignal(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* таблица */}
      <section className="panel table-panel">
        <h2>Клиенты под риском</h2>
        <p className="muted">
          Клик по заголовку меняет направление сортировки; подсвеченная строка только что обновилась
        </p>

        {error ? (
          <div className="state state-error">
            <p>Не удалось загрузить клиентов</p>
            <button type="button" className="btn btn-secondary" onClick={load}>повторить</button>
          </div>
        ) : !rows ? (
          <div className="state" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" />)}
          </div>
        ) : !filtered.length ? (
          <div className="state">
            <p>клиентов не найдено</p>
            <span className="muted">Попробуйте изменить или сбросить фильтры</span>
            <button type="button" className="btn btn-secondary" onClick={reset}>сбросить фильтры</button>
          </div>
        ) : (
          <div className="grid" role="table">
            <div className="grid-head" role="row">
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return c.sortable ? (
                  <button
                    key={c.key}
                    type="button"
                    role="columnheader"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`th th-${c.key} ${c.num ? 'num' : ''} ${active ? 'is-sorted' : ''}`}
                    onClick={() => onSort(c.key)}
                  >
                    {c.label}
                    <SortIcon dir={active ? sort.dir : null} />
                  </button>
                ) : (
                  <span key={c.key} role="columnheader" className={`th th-${c.key}`}>{c.label}</span>
                );
              })}
            </div>

            {slice.map((c) => {
              const lvl = getLevel(c.score);
              const meta = LEVELS.find((l) => l.key === lvl);
              return (
                <div
                  key={c.id}
                  role="row"
                  tabIndex={0}
                  className={`row ${c.id === updatedId ? 'is-updated' : ''}`}
                  onClick={() => openCard(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openCard(c.id)}
                >
                  <span className="td td-id">{c.id}</span>
                  <span className="td td-email">{c.email}</span>
                  <span className="td num">{eur(c.balance)}</span>
                  <span className="td num">{eur(c.topped)}</span>
                  <span className="td td-score">
                    {c.score == null ? (
                      <span className="dash">—</span>
                    ) : (
                      <>
                        <b>{c.score}</b>
                        <span className="bar"><span className={`bar-fill ${lvl}`} style={{ width: `${c.score}%` }} /></span>
                      </>
                    )}
                  </span>
                  <span className="td">
                    <span className={`badge badge-${lvl}`}>
                      <i style={{ background: meta.dot }} />
                      {meta.label}
                    </span>
                  </span>
                  <span className={`td td-reason ${c.score == null ? 'muted' : ''}`}>{reasonOf(c)}</span>
                  <span className="td num strong">{c.atRisk == null ? '—' : eurInt(c.atRisk)}</span>
                </div>
              );
            })}
          </div>
        )}

        {rows && filtered.length > 0 && (
          <footer className="pager">
            <span className="muted">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} из {filtered.length}
            </span>
            <nav aria-label="Страницы">
              <button type="button" className="page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Назад">‹</button>
              {pagesList(safePage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="page page-dots">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`page ${p === safePage ? 'is-current' : ''}`}
                    aria-current={p === safePage ? 'page' : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button type="button" className="page" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="Вперёд">›</button>
            </nav>
          </footer>
        )}
      </section>
    </div>
  );
}
