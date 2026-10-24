import { useEffect, useMemo, useState } from 'react';
import {
  MAX_WEIGHT,
  fetchModelPreview,
  loadModelConfig,
  saveModelConfig,
} from '../api/modelApi';
import './ModelSettings.css';

const LEVEL_ROWS = [
  { key: 'high', label: 'высокий' },
  { key: 'mid', label: 'средний' },
  { key: 'low', label: 'низкий' },
];

/* ───────── хелперы ───────── */
const eurInt = (v) => Math.round(v).toLocaleString('ru-RU') + ' €';

const parseThreshold = (text) =>
  /^\d{1,3}$/.test(text) && Number(text) <= 100 ? Number(text) : null;

const toText = (t) => ({ mid: String(t.mid), high: String(t.high) });

const sameConfig = (a, b) =>
  a.thresholds.mid === b.thresholds.mid &&
  a.thresholds.high === b.thresholds.high &&
  a.features.every(
    (f, i) => f.enabled === b.features[i].enabled && f.weight === b.features[i].weight,
  );

function daysLabel(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  const word =
    m10 === 1 && m100 !== 11
      ? 'день'
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
        ? 'дня'
        : 'дней';
  return `${n} ${word}`;
}

/* ───────── части страницы ───────── */
function Toggle({ on, label, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`ms-toggle${on ? ' is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ms-toggle-knob" />
    </button>
  );
}

function FeatureRow({ feature, disabled, onChange }) {
  const { id, title, description, enabled, weight } = feature;

  return (
    <li className={`ms-feature${enabled ? '' : ' is-off'}`}>
      <Toggle
        on={enabled}
        label={title}
        disabled={disabled}
        onChange={(value) => onChange(id, { enabled: value })}
      />
      <div className="ms-feature-text">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <input
        type="range"
        className="ms-range"
        min={0}
        max={MAX_WEIGHT}
        step={1}
        value={weight}
        disabled={disabled || !enabled}
        aria-label={`Вес признака «${title}»`}
        style={{ '--fill': `${(weight / MAX_WEIGHT) * 100}%` }}
        onChange={(event) => onChange(id, { weight: Number(event.target.value) })}
      />
      <div className="ms-value">{weight}</div>
    </li>
  );
}

function Delta({ from, to }) {
  const diff = to - from;
  if (diff === 0) return <span className="ms-delta is-zero">0</span>;
  return (
    <span className={`ms-delta ${diff > 0 ? 'is-up' : 'is-down'}`}>
      {diff > 0 ? '▲' : '▼'}
      {Math.abs(diff)}
    </span>
  );
}

function PreviewCard({ preview }) {
  const loss = preview?.loss;
  const diff = loss ? loss.next - loss.current : 0;

  return (
    <section className="ms-card ms-card-dark" aria-labelledby="ms-preview-title">
      <h2 id="ms-preview-title">что изменится</h2>
      <p className="ms-card-sub">превью до сохранения</p>

      <ul className="ms-levels">
        {LEVEL_ROWS.map(({ key, label }) => {
          const row = preview?.levels[key];
          return (
            <li key={key}>
              <span className="ms-levels-name">{label}</span>
              {row ? (
                <>
                  <span className="ms-levels-old">{row.current}</span>
                  <span className="ms-levels-arrow" aria-hidden="true">→</span>
                  <b>{row.next}</b>
                  <Delta from={row.current} to={row.next} />
                </>
              ) : (
                <span className="ms-levels-old">—</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="ms-money">
        <p className="ms-money-label">денежная оценка потерь</p>
        <div className="ms-money-row">
          <strong>{loss ? eurInt(loss.next) : '—'}</strong>
          {loss && (
            <span className={`ms-badge ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : 'is-zero'}`}>
              {diff > 0 && `▲ +${eurInt(diff)}`}
              {diff < 0 && `▼ −${eurInt(-diff)}`}
              {diff === 0 && 'без изменений'}
            </span>
          )}
        </div>
        <p className="ms-money-now">сейчас {loss ? eurInt(loss.current) : '—'}</p>
      </div>
    </section>
  );
}

function ThresholdsCard({ thr, mid, high, valid, fallback, disabled, onChange, onBlur }) {
  // шкала рисуется по последним корректным значениям, пока в поле что-то вводят
  const shownMid = mid ?? fallback.mid;
  const shownHigh = Math.max(shownMid, high ?? fallback.high);
  const parts = [shownMid, shownHigh - shownMid, 100 - shownHigh];

  return (
    <section className="ms-card" aria-labelledby="ms-thr-title">
      <div className="ms-card-head">
        <h2 id="ms-thr-title">пороги уровней</h2>
        <p className="ms-card-sub">шкала score 0–100</p>
      </div>

      <div className="ms-scale" aria-hidden="true">
        <div className="ms-scale-bar">
          <i className="is-low" style={{ flexGrow: parts[0] }} />
          <i className="is-mid" style={{ flexGrow: parts[1] }} />
          <i className="is-high" style={{ flexGrow: parts[2] }} />
        </div>
        <div className="ms-scale-labels">
          <span style={{ flexGrow: parts[0] }}>0</span>
          <span style={{ flexGrow: parts[1] }}>{shownMid}</span>
          <span style={{ flexGrow: parts[2] }}>{shownHigh}</span>
        </div>
      </div>

      <div className="ms-thresholds">
        {[
          { key: 'mid', label: 'Средний от', dot: 'is-mid' },
          { key: 'high', label: 'Высокий от', dot: 'is-high' },
        ].map(({ key, label, dot }) => (
          <label key={key} className="ms-threshold">
            <span className="ms-threshold-name">
              <i className={dot} />
              {label}
            </span>
            <input
              className="ms-num"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              value={thr[key]}
              disabled={disabled}
              aria-invalid={!valid}
              onChange={(event) => onChange(key, event.target.value)}
              onBlur={() => onBlur(key)}
            />
          </label>
        ))}
      </div>

      <p className={`ms-hint${valid ? '' : ' is-error'}`} aria-live="polite">
        валидация: «средний» должен быть меньше «высокий»
      </p>
    </section>
  );
}

function ParamsCard({ params }) {
  const rows = [
    ['Горизонт прогноза', daysLabel(params.horizonDays)],
    ['Период денежной оценки', daysLabel(params.moneyPeriodDays)],
    ['Пересчёт', params.recalculation],
    ['Бонусы в покрытии', params.bonusesInCoverage ? 'учитывать' : 'не учитывать'],
  ];

  return (
    <section className="ms-card" aria-labelledby="ms-params-title">
      <div className="ms-card-head">
        <h2 id="ms-params-title">параметры прогноза</h2>
      </div>
      <ul className="ms-params">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <span className="ms-chip">{value}</span>
          </li>
        ))}
      </ul>
      <p className="ms-hint ms-hint-note">настройки сохраняются после перезапуска</p>
    </section>
  );
}

/* ───────── страница ───────── */
export default function ModelSettings() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadKey, setLoadKey] = useState(0);
  const [saved, setSaved] = useState(null); // то, что лежит на сервере
  const [params, setParams] = useState(null);
  const [features, setFeatures] = useState([]); // черновик: признаки
  const [thr, setThr] = useState({ mid: '', high: '' }); // черновик: пороги (строки для ввода)
  const [preview, setPreview] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');

  const mid = parseThreshold(thr.mid);
  const high = parseThreshold(thr.high);
  const thresholdsValid = mid !== null && high !== null && mid < high;
  const draft = useMemo(() => ({ features, thresholds: { mid, high } }), [features, mid, high]);
  const dirty = saved !== null && !sameConfig(saved, draft);
  const busy = saveState === 'saving';

  const applySaved = (config) => {
    setSaved(config);
    setFeatures(config.features);
    setThr(toText(config.thresholds));
  };

  // загрузка настроек
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    loadModelConfig()
      .then(({ config, params: serverParams }) => {
        if (cancelled) return;
        applySaved(config);
        setParams(serverParams);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  // превью «что изменится» пересчитывается при любой правке черновика
  useEffect(() => {
    if (!saved || !thresholdsValid) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchModelPreview({ current: saved, draft })
        .then((result) => {
          if (!cancelled) setPreview(result);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [saved, draft, thresholdsValid]);

  // плашка «изменения сохранены» гаснет сама
  useEffect(() => {
    if (saveState !== 'saved') return undefined;
    const timer = setTimeout(() => setSaveState('idle'), 3000);
    return () => clearTimeout(timer);
  }, [saveState]);

  const updateFeature = (id, patch) => {
    setFeatures((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setSaveState('idle');
  };

  const updateThreshold = (key, value) => {
    setThr((t) => ({ ...t, [key]: value.replace(/\D/g, '').slice(0, 3) }));
    setSaveState('idle');
  };

  const normalizeThreshold = (key) =>
    setThr((t) => (parseThreshold(t[key]) === null ? t : { ...t, [key]: String(Number(t[key])) }));

  const reset = () => {
    applySaved(saved);
    setSaveState('idle');
  };

  const save = async () => {
    setSaveState('saving');
    try {
      applySaved(await saveModelConfig(draft));
      setSaveState('saved');
    } catch (error) {
      setSaveError(error.message || 'не удалось сохранить');
      setSaveState('error');
    }
  };

  let note = null;
  if (saveState === 'saved') note = { kind: 'ok', text: 'изменения сохранены' };
  else if (saveState === 'error') note = { kind: 'danger', text: saveError };
  else if (dirty) note = { kind: 'warn', text: 'есть несохранённые изменения' };

  return (
    <div className="ms">
      <header className="ms-head">
        {status === 'ready' && (
          <div className="ms-actions">
            <div role="status" aria-live="polite">
              {note && (
                <span className={`ms-pill is-${note.kind}`}>
                  <i />
                  {note.text}
                </span>
              )}
            </div>
            <button
              type="button"
              className="ms-btn ms-btn-secondary"
              onClick={reset}
              disabled={!dirty || busy}
            >
              сбросить
            </button>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={save}
              disabled={!dirty || !thresholdsValid || busy}
            >
              {busy ? 'сохраняю…' : 'сохранить'}
            </button>
          </div>
        )}
        <div className="ms-title">
          <h1>настройка модели</h1>
          <p>коэффициенты risk-score, пороги уровней и параметры денежной оценки</p>
        </div>
      </header>

      {status === 'loading' && <p className="ms-state">загружаем настройки модели…</p>}

      {status === 'error' && (
        <div className="ms-state" role="alert">
          <p>Не удалось загрузить настройки модели. Проверьте соединение и повторите.</p>
          <button
            type="button"
            className="ms-btn ms-btn-secondary"
            onClick={() => setLoadKey((k) => k + 1)}
          >
            повторить
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="ms-grid">
          <div className="ms-col">
            <section className="ms-card" aria-labelledby="ms-features-title">
              <div className="ms-card-head">
                <h2 id="ms-features-title">признаки риска</h2>
                <p className="ms-card-sub">
                  вес — вклад сигнала в итоговый score (0–{MAX_WEIGHT} баллов). Список приходит из API:
                  новый признак в коде появляется здесь сам
                </p>
              </div>
              <ul className="ms-features">
                {features.map((feature) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    disabled={busy}
                    onChange={updateFeature}
                  />
                ))}
              </ul>
            </section>

            <section className="ms-card" aria-labelledby="ms-formula-title">
              <div className="ms-card-head">
                <h2 id="ms-formula-title">как считается модель</h2>
                <p className="ms-card-sub">кратко для жюри и маркетолога</p>
              </div>
              <dl className="ms-formula">
                <dt>risk-score</dt>
                <dd>
                  = нормировка 0–100 от Σ (вес признака × сила сигнала). Клиент без услуг получает
                  «нет оценки», а не низкий риск.
                </dd>
                <dt>потери клиента</dt>
                <dd>
                  = Σ по услугам: цена за горизонт × вероятность оттока − средства, которых хватит на
                  продление.
                </dd>
                <dt>вероятность оттока</dt>
                <dd>
                  берётся из score клиента и зависит от уровня риска; при смене весов
                  пересчитывается автоматически.
                </dd>
              </dl>
            </section>
          </div>

          <div className="ms-col">
            <PreviewCard preview={preview} />
            <ThresholdsCard
              thr={thr}
              mid={mid}
              high={high}
              valid={thresholdsValid}
              fallback={saved.thresholds}
              disabled={busy}
              onChange={updateThreshold}
              onBlur={normalizeThreshold}
            />
            <ParamsCard params={params} />
          </div>
        </div>
      )}
    </div>
  );
}
