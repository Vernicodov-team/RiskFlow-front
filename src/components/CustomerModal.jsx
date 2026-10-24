import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CustomerModal.css';

const DEMO = {
  10091: {
    chips: [
      { label: 'автопродление выкл.', tone: 'danger' },
      { label: 'нет средств', tone: 'danger' },
      { label: '3 дня до конца', tone: 'warn' },
    ],
    factors: [
      { pts: 30, text: 'Автопродление выключено · dedicated-01 истекает через 3 дня', label: 'автопродление' },
      { pts: 25, text: 'Недостаточно средств · 24,00 € при продлении 900,00 €', label: 'недостаточно средств' },
      { pts: 14, text: 'Близкое истечение · осталось 3 дня', label: 'близкое истечение' },
      { pts: 5, text: 'Невыполненные транзакции', label: 'невыполненные транзакции' },
    ],
    services: [
      { name: 'dedicated-01', price: 900, autoRenew: false, until: '26 окт', days: 3 },
      { name: 'vps-web', price: 160, autoRenew: true, until: '9 ноя', days: 17 },
      { name: 'storage-01', price: 40, autoRenew: true, until: '16 ноя', days: 24 },
    ],
  },
};

const SERVICE_NAMES = ['dedicated-01', 'vps-web', 'storage-01'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const days = (n) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;

const eur = (v) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eurInt = (v) => Math.round(v).toLocaleString('ru-RU') + ' €';

const getLevel = (score) =>
  score == null ? 'none' : score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

const LEVEL = {
  high: { label: 'Высокий', color: 'var(--danger)' },
  mid: { label: 'Средний', color: 'var(--warn)' },
  low: { label: 'Низкий', color: 'var(--ok)' },
  none: { label: 'Нет оценки', color: 'var(--neutral)' },
};

function buildDetails(c) {
  if (DEMO[c.id]) return DEMO[c.id];
  if (c.score == null) return { chips: [], factors: [], services: [] };

  const s = c.signals;
  const d = c.daysLeft ?? 3;

  const chips = [];
  if (s.autoRenewOff) chips.push({ label: 'автопродление выкл.', tone: 'danger' });
  if (s.lowFunds) chips.push({ label: 'нет средств', tone: 'danger' });
  if (s.prolongWait) chips.push({ label: 'prolong_wait', tone: 'warn' });
  if (s.expiresSoon) chips.push({ label: `${days(d)} до конца`, tone: 'warn' });

  const factors = [];
  if (s.autoRenewOff) factors.push({ pts: 30, text: `Автопродление выключено · услуга истекает через ${days(d)}`, label: 'автопродление' });
  if (s.lowFunds) factors.push({ pts: 25, text: `Недостаточно средств · на балансе ${eur(c.balance)}`, label: 'недостаточно средств' });
  if (s.expiresSoon) factors.push({ pts: 14, text: `Близкое истечение · осталось ${days(d)}`, label: 'близкое истечение' });
  if (s.prolongWait) factors.push({ pts: 12, text: 'Продление ожидает обработки · prolong_wait', label: 'prolong_wait' });
  if (c.score >= 70) factors.push({ pts: 5, text: 'Невыполненные транзакции', label: 'невыполненные транзакции' });
  factors.sort((a, b) => b.pts - a.pts);

  const count = 1 + (c.id % 3);
  const services = Array.from({ length: count }, (_, i) => {
    const left = i === 0 ? (c.daysLeft ?? 10 + (c.id % 20)) : 17 + i * 7;
    const date = new Date(Date.now() + left * 86400000);
    return {
      name: SERVICE_NAMES[i],
      price: [900, 160, 40][i],
      autoRenew: i === 0 ? !s.autoRenewOff : true,
      until: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      days: left,
    };
  });

  return { chips, factors, services };
}

/* ───────── компонент ───────── */
const FOCUSABLE = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export default function CustomerModal({ customer: c, position, total, onPrev, onNext, onClose, onOpenFull }) {
  const dialogRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onPrev, onNext, onClose };

  const details = useMemo(() => buildDetails(c), [c]);
  const level = getLevel(c.score);
  const meta = LEVEL[level];
  const topFactors = details.factors.slice(0, 3);
  const restFactors = details.factors.slice(3);

  // фокус, блокировка прокрутки, клавиатура
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKey = (e) => {
      const h = handlers.current;
      if (e.key === 'Escape') { e.preventDefault(); h.onClose(); }
      else if (e.key === 'ArrowLeft' && h.onPrev) { e.preventDefault(); h.onPrev(); }
      else if (e.key === 'ArrowRight' && h.onNext) { e.preventDefault(); h.onNext(); }
      else if (e.key === 'Tab') {
        const items = dialogRef.current?.querySelectorAll(FOCUSABLE);
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const filled = c.score == null ? 0 : (c.score / 100) * CIRC;

  return createPortal(
    <div
      className="cm-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        {/* навигация */}
        <div className="cm-nav">
          <div className="cm-nav-left">
            <button type="button" className="cm-round" onClick={onPrev} disabled={!onPrev} aria-label="Предыдущий клиент">‹</button>
            <span className="cm-pos">{position} из {total} в рейтинге</span>
            <button type="button" className="cm-round" onClick={onNext} disabled={!onNext} aria-label="Следующий клиент">›</button>
          </div>
          <div className="cm-nav-right">
            <span className="cm-esc">esc</span>
            <button type="button" className="cm-round" onClick={onClose} aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="m3 3 12 12M15 3 3 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* шапка клиента */}
        <header className="cm-head">
          <div className="cm-ring" role="img" aria-label={c.score == null ? 'Оценка недоступна' : `risk-score ${c.score} из 100`}>
            <svg viewBox="0 0 124 124" aria-hidden="true">
              <circle cx="62" cy="62" r={R} className="cm-ring-track" />
              <circle
                cx="62" cy="62" r={R}
                className="cm-ring-fill"
                style={{ stroke: meta.color }}
                strokeDasharray={`${filled} ${CIRC}`}
                transform="rotate(-90 62 62)"
              />
            </svg>
            <div className="cm-ring-text">
              <b>{c.score ?? '—'}</b>
              <span>из 100</span>
            </div>
          </div>

          <div className="cm-who">
            <div className="cm-who-top">
              <h2 id="cm-title">{c.email}</h2>
              <span className={`cm-badge cm-badge-${level}`}>
                <i style={{ background: meta.color }} />
                {meta.label}
              </span>
            </div>
            <p className="cm-meta">
              ID {c.id} · {details.services.length} {plural(details.services.length, 'услуга', 'услуги', 'услуг')} · пополнено {eur(c.topped)}
            </p>
            {details.chips.length > 0 && (
              <ul className="cm-chips">
                {details.chips.map((chip) => (
                  <li key={chip.label} className={`cm-chip cm-chip-${chip.tone}`}>{chip.label}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="cm-risk">
            <span>под риском</span>
            <b>{c.atRisk == null ? '—' : eurInt(c.atRisk)}</b>
          </div>
        </header>

        {/* факторы */}
        <section className="cm-section" aria-labelledby="cm-why">
          <div className="cm-section-head">
            <h3 id="cm-why">почему такой риск</h3>
            {details.factors.length > 0 && (
              <span>топ-{topFactors.length} из {details.factors.length} {plural(details.factors.length, 'фактора', 'факторов', 'факторов')}</span>
            )}
          </div>

          {topFactors.length ? (
            <ul className="cm-factors">
              {topFactors.map((f) => (
                <li key={f.label}>
                  <b className="cm-pts">+{f.pts}</b>
                  <span className="cm-factor-text">{f.text}</span>
                  <span className="cm-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (f.pts / 30) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cm-none">
              {c.score == null ? 'Нет услуг — оценка недоступна' : 'Явных факторов риска нет'}
            </p>
          )}

          {restFactors.length > 0 && (
            <p className="cm-more">
              ещё {restFactors.length} {plural(restFactors.length, 'фактор', 'фактора', 'факторов')}:{' '}
              {restFactors.map((f) => `${f.label} (+${f.pts})`).join(', ')} — в полной карточке
            </p>
          )}
        </section>

        {/* услуги */}
        <section className="cm-section" aria-labelledby="cm-services">
          <div className="cm-section-head">
            <h3 id="cm-services">услуги</h3>
            <span>{details.services.length}</span>
          </div>
          {details.services.length ? (
            <ul className="cm-services">
              {details.services.map((s) => (
                <li key={s.name}>
                  <b className="cm-s-name">{s.name}</b>
                  <b className="cm-s-price">{eur(s.price)}</b>
                  <span className={`cm-renew ${s.autoRenew ? 'is-on' : 'is-off'}`}>
                    {s.autoRenew ? 'автопродл. вкл' : 'автопродл. выкл'}
                  </span>
                  <span className="cm-s-until">до {s.until} · {days(s.days)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cm-none">У клиента нет услуг</p>
          )}
        </section>

        <div className="cm-foot">
          <button type="button" className="cm-open" onClick={onOpenFull}>
            открыть полную карточку
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p>клик вне окна или esc — закрыть, список и фильтры не меняются</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
