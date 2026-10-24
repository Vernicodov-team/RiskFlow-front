import { useState } from 'react';
import { HelpCircle, ArrowRight, ArrowLeft, ChevronsUpDown, ArrowDown } from 'lucide-react';
import './Overview.css';

const RED = '#e5484d';
const YELLOW = '#e39a00';
const GREEN = '#2fa26b';
const GRAY = '#6b6b6b';

const euro = (cents) =>
    (cents / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const euroNoDecimals = (cents) =>
    (cents / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const donutData = [
    { name: 'Высокий', value: 18, color: RED },
    { name: 'Средний', value: 37, color: YELLOW },
    { name: 'Низкий', value: 61, color: GREEN },
    { name: 'Нет оценки', value: 12, color: GRAY },
];

const reasonsData = [
    { name: 'Автопродление выключено', count: 28 },
    { name: 'Недостаточно средств на продление', count: 21 },
    { name: 'Истекает в ближайшие 7 дней', count: 12 },
    { name: 'prolong_wait без средств', count: 9 },
    { name: 'Невыполненные транзакции', count: 6 },
];

const moneyData = [
    { level: 'Высокий', amount: 984000, percent: 68, width: 100, color: RED },
    { level: 'Средний', amount: 392000, percent: 27, width: 40, color: YELLOW },
    { level: 'Низкий', amount: 62000, percent: 5, width: 6, color: GREEN },
];

const topCustomers = [
    { id: 10482, email: 'olga.petrova@mail.ru', balance: 320, replenished: 14200, score: 92, level: 'Высокий', reason: 'Автопродление выкл., баланс < цены', atRisk: 118000 },
    { id: 10317, email: 'dm.sokolov@yandex.ru', balance: 0, replenished: 8950, score: 87, level: 'Высокий', reason: 'prolong_wait, нет средств', atRisk: 96000 },
    { id: 10655, email: 'anna.k@gmail.com', balance: 1140, replenished: 31000, score: 81, level: 'Высокий', reason: 'Услуга истекает через 2 дня', atRisk: 84200 },
    { id: 10091, email: 'it-studio@corp.ru', balance: 2400, replenished: 124000, score: 74, level: 'Высокий', reason: 'Автопродление выключено', atRisk: 79000 },
    { id: 10733, email: 'n.ivanov@mail.ru', balance: 510, replenished: 4700, score: 63, level: 'Средний', reason: 'Недостаточно средств', atRisk: 41000 },
];

const levelMeta = (level) => {
    if (level === 'Высокий') return { cls: 'badge-red', color: RED };
    if (level === 'Средний') return { cls: 'badge-yellow', color: YELLOW };
    return { cls: 'badge-green', color: GREEN };
};

/* ---------- Donut ---------- */
function Donut() {
    const total = donutData.reduce((s, d) => s + d.value, 0);
    const r = 75;
    const c = 2 * Math.PI * r;
    const gap = 3;
    let acc = 0;
    return (
        <div className="overview-donut">
            <svg width="180" height="180" viewBox="0 0 180 180">
                <g transform="rotate(-90 90 90)">
                    {donutData.map((d) => {
                        const len = (d.value / total) * c;
                        const el = (
                            <circle
                                key={d.name}
                                cx="90"
                                cy="90"
                                r={r}
                                fill="none"
                                stroke={d.color}
                                strokeWidth="26"
                                strokeDasharray={`${Math.max(len - gap, 0)} ${c - len + gap}`}
                                strokeDashoffset={-(acc + gap / 2)}
                            />
                        );
                        acc += len;
                        return el;
                    })}
                </g>
            </svg>
            <div className="overview-donut-center">
                <span className="overview-donut-value">128</span>
                <span className="overview-donut-label">клиентов</span>
            </div>
        </div>
    );
}

/* ---------- Dynamics chart (custom SVG) ---------- */
const factRemoved = [2, 3, 1, 4, 2, 3, 5, 2, 3, 4, 3];
const factRisk = [38, 40, 41, 43, 42, 44, 45, 44, 46, 47, 47];
const fcRemoved = [4, 5, 4, 6, 5, 7, 6, 8, 7, 6];
const fcRisk = [49, 50, 52, 51, 54, 55, 57, 58, 59, 60];
const dates = ['13 окт', '15', '17', '19', '21', '23', '25', '27', '29', '31', '2 ноя'];

// Координаты: SVG начинается в (340, 990) относительно страницы 1440 × 1857
const OX = 340;
const OY = 990;
const X0 = 395.19 - OX; // левый край первой колонки
const STEP = 44.381;
const cx = (i) => 406.19 - OX + i * STEP;
const yRight = (v) => 1238 - OY - (v / 12) * 200;
const yLeft = (v) => 1238 - OY - (v / 60) * 200;

function Dynamics() {
    const factPts = factRisk.map((v, i) => [cx(i), yLeft(v)]);
    const fcPts = [factPts[10], ...fcRisk.map((v, i) => [cx(11 + i), yLeft(v)])];
    const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
    const todayX = 850 - OX;
    return (
        <svg className="overview-chart" width="1020" height="300" viewBox="0 0 1020 300">
            <text x="0" y="31" className="chart-axis-title">услуг под риском</text>
            <text x="1020" y="31" textAnchor="end" className="chart-axis-title">удалений / непродлений в день</text>

            {/* прогнозная зона */}
            <rect x={todayX} y={1028 - OY} width={1316 - 850} height="220" rx="12" fill="#fde6d2" />

            {/* сетка и подписи осей */}
            {[0, 1, 2, 3, 4].map((k) => {
                const y = 1038 - OY + k * 50;
                return (
                    <g key={k}>
                        <rect x={384 - OX} y={y - 0.5} width="932" height="1" fill="#e6e6e6" />
                        <text x="33" y={y + 4.5} textAnchor="end" className="chart-tick">{60 - k * 15}</text>
                        <text x={1331 - OX} y={y + 4.5} className="chart-tick">{12 - k * 3}</text>
                    </g>
                );
            })}
            {/* линия-ориентир ниже зоны-сетки, поверх прогноза */}
            <rect x={384 - OX} y={1238 - OY - 0.5} width="932" height="1" fill="#e6e6e6" />

            {/* бары факта */}
            {factRemoved.map((v, i) => (
                <rect key={i} x={X0 + i * STEP} y={yRight(v)} width="22" height={(v / 12) * 200} rx="6" fill="#1f1f1f" />
            ))}
            {/* бары прогноза */}
            {fcRemoved.map((v, i) => (
                <rect
                    key={i}
                    x={X0 + (11 + i) * STEP + 1}
                    y={yRight(v) + 1}
                    width="20"
                    height={(v / 12) * 200 - 2}
                    rx="5"
                    fill="none"
                    stroke="#ff7a00"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                />
            ))}

            {/* линии */}
            <path d={path(factPts)} stroke="#ff7a00" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path(fcPts)} stroke="#ff7a00" strokeWidth="3" fill="none" strokeDasharray="6 5" strokeLinejoin="round" />

            {/* сегодня */}
            <rect x={todayX - 0.75} y={1028 - OY} width="1.5" height="220" fill="#1a1a1a" />
            <circle cx={todayX} cy={yLeft(47)} r="4" fill="#ff7a00" stroke="#fff" strokeWidth="2" />
            <rect x={795.5 - OX} y={1010 - OY} width="109" height="21" rx="10.5" fill="#1f1f1f" />
            <text x={850 - OX} y={1024.5 - OY} textAnchor="middle" className="chart-today">сегодня · 23 окт</text>
            <text x={785 - OX} y={1025 - OY} textAnchor="end" className="chart-side-label">← факт</text>
            <text x={914 - OX} y={1025 - OY} className="chart-side-label chart-side-label-accent">прогноз →</text>

            {/* ось X */}
            {dates.map((d, i) => (
                <text key={d} x={cx(i * 2)} y={1266 - OY} textAnchor="middle" className="chart-tick">{d}</text>
            ))}
        </svg>
    );
}

export default function Overview() {
    const [range, setRange] = useState('30 д');

    return (
        <div className="overview">
            <div className="overview-header">
                <div className="overview-watermark">ОБЗОР</div>
                <h1 className="overview-title">обзор рисков оттока</h1>
                <p className="overview-subtitle">кому нужно внимание, почему и сколько денег под риском</p>
            </div>

            <div className="overview-grid overview-grid-4">
                <div className="overview-card overview-card-dark">
                    <div className="overview-card-dark-top">
                        <span className="overview-card-label">денежная оценка потерь</span>
                        <HelpCircle size={20} strokeWidth={1.25} className="overview-help-icon" />
                    </div>
                    <div className="overview-card-dark-amount">14 380 €</div>
                    <div className="overview-growth-badge">
                        <svg width="12" height="11" viewBox="0 0 12 11"><path d="M6 0.5 L11.5 10.5 H0.5 Z" fill="#fff" /></svg>
                        <span>+6,2% за сутки</span>
                    </div>
                    <p className="overview-card-dark-hint">
                        Σ по услугам: цена × вероятность оттока – доступные средства клиента. Горизонт — 30 дней.
                    </p>
                </div>

                <div className="overview-card">
                    <div className="overview-card-label">клиенты по уровням</div>
                    <div className="overview-big-value-wrap">
                        <span className="overview-big-value">128</span>
                        <span className="overview-big-unit">всего</span>
                    </div>
                    <div className="overview-segmented-bar">
                        <div className="bg-red" style={{ flex: 14 }}></div>
                        <div className="bg-yellow" style={{ flex: 29 }}></div>
                        <div className="bg-green" style={{ flex: 48 }}></div>
                        <div className="bg-gray" style={{ flex: 9 }}></div>
                    </div>
                    <div className="overview-rows">
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-red"></span>Высокий</div><span className="overview-row-right">18 · 14%</span></div>
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-yellow"></span>Средний</div><span className="overview-row-right">37 · 29%</span></div>
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-green"></span>Низкий</div><span className="overview-row-right">61 · 48%</span></div>
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-gray"></span>Нет оценки</div><span className="overview-row-right">12 · 9%</span></div>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-card-label">услуг под риском</div>
                    <div className="overview-big-value-wrap">
                        <span className="overview-big-value">47</span>
                        <span className="overview-big-unit">из 214 · 22%</span>
                    </div>
                    <div className="overview-segmented-bar">
                        <div className="bg-orange" style={{ flex: '0 0 21.64%' }}></div>
                        <div className="bg-track" style={{ flex: 1 }}></div>
                    </div>
                    <div className="overview-rows">
                        <div className="overview-row"><span>автопродление выкл.</span><span className="overview-row-right">28</span></div>
                        <div className="overview-row"><span>нехватка средств</span><span className="overview-row-right">21</span></div>
                        <div className="overview-row"><span>prolong_wait</span><span className="overview-row-right">9</span></div>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-card-label">ближайшие истечения</div>
                    <div className="overview-big-value-wrap">
                        <span className="overview-big-value">31</span>
                        <span className="overview-big-unit">за 14 дней</span>
                    </div>
                    <div className="overview-segmented-bar">
                        <div className="bg-red" style={{ flex: 8 }}></div>
                        <div className="bg-yellow" style={{ flex: 12 }}></div>
                        <div className="bg-green" style={{ flex: 11 }}></div>
                    </div>
                    <div className="overview-rows">
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-red"></span>≤ 3 дня</div><span className="overview-row-right">8</span></div>
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-yellow"></span>4–7 дней</div><span className="overview-row-right">12</span></div>
                        <div className="overview-row"><div className="overview-row-left"><span className="overview-dot bg-green"></span>8–14 дней</div><span className="overview-row-right">11</span></div>
                    </div>
                </div>
            </div>

            <div className="overview-grid overview-grid-3">
                <div className="overview-card overview-card-donut">
                    <div className="overview-card-head">
                        <div className="overview-card-title">распределение клиентов</div>
                        <p className="overview-card-subtitle">клик по сегменту → фильтр в «клиенты»</p>
                    </div>
                    <Donut />
                    <div className="overview-legend-rows">
                        {donutData.map((item) => (
                            <div className="overview-row" key={item.name}>
                                <div className="overview-row-left">
                                    <span className="overview-dot" style={{ backgroundColor: item.color }}></span>
                                    {item.name}
                                </div>
                                <span className="overview-row-right">{Math.round((item.value / 128) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overview-card overview-card-reasons">
                    <div className="overview-card-head">
                        <div className="overview-card-title">топ причин риска</div>
                        <p className="overview-card-subtitle">сколько клиентов затронуто каждым сигналом</p>
                    </div>
                    <div className="overview-reasons">
                        {reasonsData.map((item) => (
                            <div key={item.name}>
                                <div className="overview-row">
                                    <span className="overview-reason-name">{item.name}</span>
                                    <span className="overview-row-right">{item.count}</span>
                                </div>
                                <div className="overview-track">
                                    <div className="overview-track-fill bg-orange" style={{ width: `${(item.count / 30) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overview-card overview-card-money">
                    <div className="overview-card-head">
                        <div className="overview-card-title">деньги под риском по уровням</div>
                        <p className="overview-card-subtitle">где сосредоточены потери</p>
                    </div>
                    <div className="overview-money-list">
                        {moneyData.map((item) => (
                            <div key={item.level}>
                                <div className="overview-money-top">
                                    <div className="overview-row-left">
                                        <span className="overview-dot" style={{ backgroundColor: item.color }}></span>
                                        {item.level}
                                    </div>
                                    <div className="overview-money-values">
                                        <span className="overview-money-amount">{euroNoDecimals(item.amount)} €</span>
                                        <span className="overview-money-percent">{item.percent}%</span>
                                    </div>
                                </div>
                                <div className="overview-track">
                                    <div className="overview-track-fill" style={{ width: `${item.width}%`, backgroundColor: item.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="overview-money-total">
                        <span className="overview-money-total-label">итого за 30 дней</span>
                        <span className="overview-money-total-value">14 380 €</span>
                    </div>
                    <p className="overview-card-hint">68% потерь — у клиентов с высоким риском. Начните с них.</p>
                </div>
            </div>

            <div className="overview-card overview-card-dynamics">
                <div className="overview-dynamics-header">
                    <div>
                        <div className="overview-card-title">динамика оттока</div>
                        <p className="overview-card-subtitle">услуги под риском, удаления (факт) и ожидаемые непродления (прогноз)</p>
                    </div>
                    <div className="overview-pill-group">
                        {['7 д', '30 д', '90 д'].map((r) => (
                            <button
                                key={r}
                                className={`overview-pill ${range === r ? 'overview-pill-active' : ''}`}
                                onClick={() => setRange(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overview-legend">
                    <div className="overview-legend-item"><span className="overview-legend-box"></span>удаления услуг — факт</div>
                    <div className="overview-legend-item"><span className="overview-legend-box overview-legend-box-dashed"></span>непродления — прогноз</div>
                    <div className="overview-legend-item"><span className="overview-legend-line"></span>услуги под риском (факт)</div>
                    <div className="overview-legend-item"><span className="overview-legend-line overview-legend-line-dashed"></span>услуги под риском (прогноз)</div>
                </div>
                <Dynamics />
                <p className="overview-card-hint overview-dynamics-hint">
                    Исторические данные накапливаются с момента запуска; прогноз пересчитывается при изменении коэффициентов.
                </p>
            </div>

            <div className="overview-card overview-card-customers">
                <div className="overview-customers-header">
                    <div>
                        <div className="overview-card-title">топ клиентов под риском</div>
                        <p className="overview-card-subtitle">сортировка по любому столбцу в обе стороны — на экране «Клиенты»</p>
                    </div>
                    <a href="/customers" className="overview-link-orange">
                        смотреть всех <ArrowRight size={16} strokeWidth={2} />
                    </a>
                </div>
                <table className="overview-customers-table">
                    <colgroup>
                        <col style={{ width: 72 }} />
                        <col style={{ width: 180 }} />
                        <col style={{ width: 114 }} />
                        <col style={{ width: 101 }} />
                        <col style={{ width: 121 }} />
                        <col style={{ width: 128 }} />
                        <col style={{ width: 204 }} />
                        <col />
                    </colgroup>
                    <thead>
                    <tr>
                        <th className="th-id">ID <ChevronsUpDown size={14} /></th>
                        <th className="th-email">email <ChevronsUpDown size={14} /></th>
                        <th className="text-right th-balance">баланс <ChevronsUpDown size={14} /></th>
                        <th className="text-right th-repl">пополнено <ChevronsUpDown size={14} /></th>
                        <th className="th-score th-active">risk-score <ArrowDown size={14} /></th>
                        <th className="th-level">уровень</th>
                        <th className="th-reason">главная причина</th>
                        <th className="text-right th-risk">под риском <ChevronsUpDown size={14} /></th>
                    </tr>
                    </thead>
                    <tbody>
                    {topCustomers.map((c) => {
                        const meta = levelMeta(c.level);
                        return (
                            <tr key={c.id}>
                                <td className="td-id">{c.id}</td>
                                <td className="td-email">{c.email}</td>
                                <td className="text-right td-balance">{euro(c.balance)} €</td>
                                <td className="text-right td-repl">{euro(c.replenished)} €</td>
                                <td className="td-score">
                                    <div className="overview-score-cell">
                                        <span className="overview-score-value">{c.score}</span>
                                        <div className="overview-score-bar">
                                            <div className="overview-score-fill" style={{ width: `${(c.score / 100) * 56}px`, background: meta.color }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="td-level">
                                    <span className={`badge ${meta.cls}`}>
                                        <span className="overview-badge-dot" style={{ backgroundColor: meta.color }}></span>
                                        {c.level}
                                    </span>
                                </td>
                                <td className="td-reason">{c.reason}</td>
                                <td className="text-right td-risk">{euroNoDecimals(c.atRisk)} €</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
