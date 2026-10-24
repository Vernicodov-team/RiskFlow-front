import { useEffect, useRef, useState } from 'react';
import './SourceData.css';

/* ───────── API ─────────
 * Заглушки. Замените на вызовы из ../api/sourceApi.js:
 *  replaceSnapshot(data)        → PUT /api/v1/source/snapshot
 *  patchClient(id, autoRenew)   → изменение клиента + пересчёт
 */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = {
  replaceSnapshot: async (/* data */) => { await wait(700); },
  patchClient: async (/* id, autoRenew */) => { await wait(500); },
};

const MAX_SIZE = 16 * 1024 * 1024;
const SECTIONS = ['accounts', 'services', 'transactions'];
const SECTION_LABEL = { accounts: 'аккаунтов', services: 'услуг', transactions: 'транзакций' };
const WARN_LIMIT = 5;

const CLIENTS = [
  { id: 10482, email: 'olga.petrova@mail.ru' },
  { id: 10317, email: 'dm.sokolov@yandex.ru' },
  { id: 10655, email: 'anna.k@gmail.com' },
  { id: 10091, email: 'it-studio@corp.ru' },
];

/* ───────── хелперы ───────── */
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const pad = (n) => String(n).padStart(2, '0');
const fmtDay = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const fmtSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

const fmtAgo = (sec) => (sec < 60 ? `${sec} сек назад` : `${Math.floor(sec / 60)} мин назад`);

function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: ['Корневой элемент должен быть объектом'], warnings: [], counts: null };
  }
  const errors = SECTIONS.filter((k) => !Array.isArray(data[k])).map(
    (k) => `Нет раздела ${k} или он не является списком`
  );
  if (errors.length) return { errors, warnings: [], counts: null };

  const warnings = [];
  data.services.forEach((s, i) => {
    if (!s || s.expiresAt == null) {
      warnings.push({ path: `services[${i}]`, text: 'нет поля expiresAt — услуга пропущена в расчёте' });
    }
  });
  data.accounts.forEach((a, i) => {
    if (!a || a.bonusState == null) {
      warnings.push({ path: `accounts[${i}]`, text: 'не указан bonusState — принято «бонусы недоступны»' });
    }
  });
  const counts = Object.fromEntries(SECTIONS.map((k) => [k, data[k].length]));
  return { errors: [], warnings, counts };
}

async function inspectFile(file) {
  if (file.size > MAX_SIZE) {
    return { name: file.name, size: file.size, errors: ['Файл больше 16 МБ'], warnings: [], counts: null };
  }
  try {
    const data = JSON.parse(await file.text());
    return { name: file.name, size: file.size, data, ...validate(data) };
  } catch {
    return { name: file.name, size: file.size, errors: ['Файл не является корректным JSON'], warnings: [], counts: null };
  }
}

function buildDemoFile() {
  const data = {
    accounts: Array.from({ length: 50 }, (_, i) => ({
      id: 10000 + i,
      email: `user${i}@mail.ru`,
      ...(i === 7 ? {} : { bonusState: 'available' }),
    })),
    services: Array.from({ length: 120 }, (_, i) => ({
      id: i,
      accountId: 10000 + (i % 50),
      ...(i === 14 ? {} : { expiresAt: '2026-11-01' }),
    })),
    transactions: Array.from({ length: 340 }, (_, i) => ({
      id: i,
      accountId: 10000 + (i % 50),
      amount: 10 + (i % 90),
    })),
  };
  return new File([JSON.stringify(data)], 'snapshot_2026-10-24.json', { type: 'application/json' });
}

/* ───────── иконки ───────── */
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 16V5M7 9.5 12 4.5l5 5M5 19.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="m3 7.5 2.7 2.7L11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ───────── страница ───────── */
export default function SourceData() {
  const inputRef = useRef(null);

  const [secAgo, setSecAgo] = useState(3);
  const [recalcAt, setRecalcAt] = useState(() => Date.now() - 3000);
  const [now, setNow] = useState(() => Date.now());

  const [current, setCurrent] = useState({
    loadedAt: new Date(2026, 9, 17, 9, 10),
    source: 'PUT /api/v1/source/snapshot',
    accounts: 48,
    services: 112,
    transactions: 310,
  });
  const [history, setHistory] = useState([
    { id: 1, at: new Date(2026, 9, 17, 9, 10), counts: '48 · 112 · 310', active: true },
  ]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [picked, setPicked] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showAllWarn, setShowAllWarn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'error', text }

  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const [autoRenew, setAutoRenew] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSecAgo((s) => s + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const takeFile = async (file) => {
    if (!file) return;
    setShowAllWarn(false);
    setNotice(null);
    setPicked(await inspectFile(file));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    takeFile(e.dataTransfer.files?.[0]);
  };

  const onPick = (e) => {
    takeFile(e.target.files?.[0]);
    e.target.value = ''; // чтобы можно было выбрать тот же файл повторно
  };

  const cancel = () => { setPicked(null); setShowAllWarn(false); };

  const replace = async () => {
    if (!picked || picked.errors.length) return;
    setBusy(true);
    try {
      await api.replaceSnapshot(picked.data);
      const at = new Date();
      setCurrent({
        loadedAt: at,
        source: 'PUT /api/v1/source/snapshot',
        accounts: picked.counts.accounts,
        services: picked.counts.services,
        transactions: picked.counts.transactions,
      });
      setHistory((h) => [
        {
          id: at.getTime(),
          at,
          counts: SECTIONS.map((k) => picked.counts[k]).join(' · '),
          active: true,
        },
        ...h.map((x) => ({ ...x, active: false })),
      ]);
      setRecalcAt(Date.now());
      setPicked(null);
      setNotice({ kind: 'ok', text: 'Снимок заменён, расчёт запущен' });
    } catch {
      setNotice({ kind: 'error', text: 'Не удалось заменить снимок. Данные не изменены, попробуйте ещё раз' });
    } finally {
      setBusy(false);
    }
  };

  const applyClient = async () => {
    setApplying(true);
    try {
      await api.patchClient(clientId, autoRenew);
      setRecalcAt(Date.now());
      setNotice({ kind: 'ok', text: `Данные клиента ${clientId} изменены, пересчёт запущен` });
    } catch {
      setNotice({ kind: 'error', text: 'Не удалось изменить клиента. Попробуйте ещё раз' });
    } finally {
      setApplying(false);
    }
  };

  const hasErrors = !!picked?.errors.length;
  const warnings = picked?.warnings ?? [];
  const shownWarnings = showAllWarn ? warnings : warnings.slice(0, WARN_LIMIT);
  const visibleHistory = showAllHistory ? history : history.slice(0, 2);
  const recalcSec = Math.max(0, Math.round((now - recalcAt) / 1000));

  return (
    <div className="dp">
      <header className="dp-head">
        <div className="dp-title">
          <span className="dp-watermark" aria-hidden="true">ДАННЫЕ</span>
          <h1>источник данных</h1>
          <p>загрузите или замените снимок: аккаунты, услуги и транзакции</p>
        </div>
        <div className="dp-head-actions">
          <div className="dp-live">
            <i className="dp-live-dot" />
            <b>live</b>
            <span>обновлено {secAgo} сек назад</span>
          </div>
          <button type="button" className="dp-btn dp-btn-secondary" onClick={() => takeFile(buildDemoFile())}>
            демо-данные
          </button>
        </div>
      </header>

      <div className="dp-notice-slot" role="status" aria-live="polite">
        {notice && <p className={`dp-notice dp-notice-${notice.kind}`}>{notice.text}</p>}
      </div>

      <div className="dp-grid">
        {/* загрузка */}
        <section className="dp-card dp-upload">
          <h2>загрузка снимка</h2>
          <p className="dp-sub">файл полностью заменит текущие данные, расчёт запустится сам</p>

          <div
            className={`dp-drop ${dragging ? 'is-drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="dp-drop-icon"><UploadIcon /></span>
            <p className="dp-drop-title">перетащите JSON-файл со снимком сюда</p>
            <p className="dp-drop-hint">
              форматы: JSON · обязательные разделы accounts, services, transactions · до 16 МБ
            </p>
            <button type="button" className="dp-btn dp-btn-primary" onClick={() => inputRef.current?.click()}>
              выбрать файл
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={onPick}
            />
          </div>
        </section>

        {/* текущий снимок */}
        <section className="dp-card dp-current">
          <div className="dp-card-head">
            <h2>текущий снимок</h2>
            <span className="dp-pill dp-pill-ok"><i />активен</span>
          </div>
          <dl className="dp-facts">
            <div><dt>загружен</dt><dd>{fmtDay(current.loadedAt)}, {fmtTime(current.loadedAt)}</dd></div>
            <div><dt>источник</dt><dd>{current.source}</dd></div>
            <div><dt>аккаунтов</dt><dd>{current.accounts}</dd></div>
            <div><dt>услуг</dt><dd>{current.services}</dd></div>
            <div><dt>транзакций</dt><dd>{current.transactions}</dd></div>
            <div><dt>пересчёт</dt><dd>{fmtAgo(recalcSec)}</dd></div>
          </dl>
        </section>

        {/* проверка файла */}
        <section className="dp-card dp-verify" aria-busy={busy}>
          <div className="dp-card-head">
            <div>
              <h2>проверка файла</h2>
              <p className="dp-sub dp-sub-tight">
                {picked ? `${picked.name} · ${fmtSize(picked.size)}` : 'файл ещё не выбран'}
              </p>
            </div>
            {picked && (
              hasErrors
                ? <span className="dp-pill dp-pill-danger">ошибка формата</span>
                : <span className="dp-pill dp-pill-ok"><CheckIcon />формат корректен</span>
            )}
          </div>

          {!picked && (
            <div className="dp-empty">
              <p>здесь появится проверка</p>
              <span>выберите файл или нажмите «демо-данные», чтобы увидеть, что изменится после замены</span>
            </div>
          )}

          {picked && hasErrors && (
            <ul className="dp-errors">
              {picked.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}

          {picked && !hasErrors && (
            <>
              <div className="dp-stats">
                {SECTIONS.map((k) => (
                  <div key={k} className="dp-stat">
                    <span>{SECTION_LABEL[k]}</span>
                    <b>{picked.counts[k]}</b>
                  </div>
                ))}
              </div>

              <div className="dp-diff">
                <h3>что изменится после замены</h3>
                <p>
                  {SECTIONS.map((k) => `${SECTION_LABEL[k]} ${current[k]} → ${picked.counts[k]}`).join(' · ')}
                </p>
              </div>

              {warnings.length > 0 && (
                <div className="dp-warns">
                  <h3>предупреждения · {warnings.length}</h3>
                  <ul>
                    {shownWarnings.map((w) => (
                      <li key={w.path}>
                        <i />
                        <b>{w.path}</b>
                        <span>{w.text}</span>
                      </li>
                    ))}
                  </ul>
                  {warnings.length > WARN_LIMIT && (
                    <button type="button" className="dp-link" onClick={() => setShowAllWarn((v) => !v)}>
                      {showAllWarn ? 'свернуть' : `показать ещё ${warnings.length - WARN_LIMIT}`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {picked && (
            <div className="dp-actions">
              <button
                type="button"
                className="dp-btn dp-btn-primary"
                onClick={replace}
                disabled={hasErrors || busy}
              >
                {busy ? 'заменяем…' : 'заменить снимок'}
              </button>
              <button type="button" className="dp-btn dp-btn-secondary" onClick={cancel} disabled={busy}>
                отменить
              </button>
              <span className="dp-hint">текущие данные будут заменены полностью</span>
            </div>
          )}
        </section>

        {/* изменить клиента */}
        <section className="dp-card dp-client">
          <h2>изменить данные клиента</h2>
          <p className="dp-sub dp-sub-tight">быстрая демонстрация пересчёта</p>

          <label className="dp-select">
            <span className="dp-sr">клиент</span>
            <select value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>{c.id} · {c.email}</option>
              ))}
            </select>
            <Chevron />
          </label>

          <div className="dp-seg" role="radiogroup" aria-label="Автопродление">
            <button
              type="button"
              role="radio"
              aria-checked={!autoRenew}
              className={!autoRenew ? 'is-on' : ''}
              onClick={() => setAutoRenew(false)}
            >
              автопродл. выкл
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={autoRenew}
              className={autoRenew ? 'is-on' : ''}
              onClick={() => setAutoRenew(true)}
            >
              автопродл. вкл
            </button>
          </div>

          <button type="button" className="dp-btn dp-btn-primary dp-btn-wide" onClick={applyClient} disabled={applying}>
            {applying ? 'пересчитываем…' : 'применить и пересчитать'}
          </button>
        </section>

        {/* история */}
        <section className="dp-card dp-history">
          <h2>история загрузок</h2>
          <ul>
            {visibleHistory.map((h) => (
              <li key={h.id}>
                <span className="dp-h-date">{fmtDay(h.at)} · {fmtTime(h.at)}</span>
                <span className="dp-h-counts">{h.counts}</span>
                <span className={`dp-pill ${h.active ? 'dp-pill-ok' : 'dp-pill-neutral'}`}>
                  {h.active ? 'активен' : 'заменён'}
                </span>
              </li>
            ))}
          </ul>
          {history.length > 2 && (
            <button type="button" className="dp-link dp-link-accent" onClick={() => setShowAllHistory((v) => !v)}>
              {showAllHistory ? 'свернуть' : 'показать все →'}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
