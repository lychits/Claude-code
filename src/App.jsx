import { useState, useMemo, useCallback, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, ResponsiveContainer,
} from 'recharts'

// ─── Districts K2 ───────────────────────────────────────────────────────────
const DISTRICTS = [
  { name: 'ЦАО', k2: 0.2 },
  { name: 'ЦАО (Тверской, Пресненский)', k2: 0.25 },
  { name: 'ЗАО (Дорогомилово)', k2: 0.3 },
  { name: 'ЦАО (Замоскворечье)', k2: 0.3 },
  { name: 'СВАО (Марьина роща)', k2: 0.35 },
  { name: 'САО (Беговой, Хорошёвский)', k2: 0.4 },
  { name: 'ВАО (Сокольники)', k2: 0.4 },
  { name: 'ЮЗАО (Гагаринский, Ломоносовский)', k2: 0.45 },
  { name: 'СЗАО (Щукино, Хорошёво-Мнёвники)', k2: 0.5 },
  { name: 'ЗАО (Кунцево, Фили-Давыдково)', k2: 0.5 },
  { name: 'СВАО (Алексеевский, Останкино)', k2: 0.5 },
  { name: 'ЮАО (Нагатино-Садовники)', k2: 0.55 },
  { name: 'ЮЗАО (Обручевский, Черёмушки)', k2: 0.55 },
  { name: 'ВАО (Преображенское, Богородское)', k2: 0.6 },
  { name: 'ЮАО (Царицыно, Орехово-Борисово)', k2: 0.65 },
  { name: 'СВАО (Бибирево, Отрадное)', k2: 0.65 },
  { name: 'СЗАО (Митино, Строгино)', k2: 0.7 },
  { name: 'ЗАО (Солнцево, Ново-Переделкино)', k2: 0.7 },
  { name: 'ЮВАО (Люблино, Капотня)', k2: 0.7 },
  { name: 'ЮАО (Бирюлёво, Чертаново)', k2: 0.75 },
  { name: 'ВАО (Косино-Ухтомский, Некрасовка)', k2: 0.75 },
  { name: 'ТиНАО (Троицк, Щербинка)', k2: 0.8 },
  { name: 'ТиНАО (Новомосковский АО)', k2: 0.85 },
  { name: 'ТиНАО (Троицкий АО)', k2: 0.9 },
]

// ─── Constants ───────────────────────────────────────────────────────────────
const C = {
  S1: 33,
  A: 0.257,
  THRESHOLD: 69.3,
  PERS_PER_FLAT: 2.1,
  GREEN_BASE: 5.0,
  GREEN_REDUCED: 4.25,
  PLAYGROUND_KIDS: 0.5,
  PLAYGROUND_ADULT: 0.1,
  PLAYGROUND_SPORT: 1.0,
  PLAYGROUND_ECON: 0.3,
  COST_DOO: 4329610,
  COST_SOSH: 4598220,
  COST_POLY: 6902200,
  RATIO_DOO_Z1: 44,
  RATIO_DOO_Z2: 63,
  RATIO_SOSH_Z1: 90,
  RATIO_SOSH_Z2: 124,
  RATIO_POLY_KID: 5.8,
  RATIO_POLY_ADULT: 13.2,
}

// ─── City density norm (тыс.м²/га) ──────────────────────────────────────────
function cityDensity(area) {
  if (area <= 1) return 35
  if (area <= 2.5) return 35 - (10 / 1.5) * (area - 1)
  if (area <= 5) return 25 - (1 / 2.5) * (area - 2.5)
  if (area <= 7.5) return 24 - (1 / 2.5) * (area - 5)
  if (area <= 10) return 23 - (1 / 2.5) * (area - 7.5)
  return 22
}

const fmt = (n, d = 0) => (typeof n === 'number' && isFinite(n)
  ? n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—')
const fmtM = (n) => fmt(n, 0) + ' ₽'
const clamp = (n) => Math.max(0, n)

const TABS = ['Исходные', 'Дашборд', 'Парковка', 'Озеленение', 'Соц. инфра', 'Сравнение']

// ─── Delta badge ─────────────────────────────────────────────────────────────
function Delta({ val, norm, unit = '', invert = false }) {
  if (norm == null || !isFinite(val)) return null
  const diff = val - norm
  if (diff === 0) return null
  const over = invert ? diff < 0 : diff > 0
  return (
    <span className={`delta ${over ? 'over' : 'ok'}`}>
      {diff > 0 ? '+' : ''}{fmt(diff, 1)}{unit && ' ' + unit} от нормы
    </span>
  )
}

// ─── SimpleBar ────────────────────────────────────────────────────────────────
function SimpleBar({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
        <Bar dataKey="факт" fill="#111" radius={[2, 2, 0, 0]} />
        <Bar dataKey="норма" fill="#ccc" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Map modal ────────────────────────────────────────────────────────────────
function MapModal({ onClose, selectedDistrict, onSelect }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Выбор района Москвы</h2>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
          K2 применяется к объектной парковке (нежилая СПП).
        </p>
        <div className="zone-list">
          {DISTRICTS.map((d, i) => (
            <div
              key={i}
              className={`zone-item ${selectedDistrict === i ? 'selected' : ''}`}
              onClick={() => { onSelect(i); onClose() }}
            >
              <div style={{ fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>K2 = {d.k2}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0)
  const [showMap, setShowMap] = useState(false)
  const printRef = useRef(null)

  const [inputs, setInputs] = useState({
    siteName: 'Жилой комплекс',
    siteArea: 2.5,
    floors: 17,
    flatsCount: 350,
    flatsArea: 22500,
    sppLiving: 25000,
    sppNonliving: 3000,
    k1: 0.9,
    districtIdx: 1,
    otop: false,
    zone: 'z1',
    // Project-provided social infrastructure
    projDoo: 0,
    projSosh: 0,
    projPoly: 0,
  })

  const set = useCallback((k, v) => setInputs(p => ({ ...p, [k]: v })), [])
  const setNum = useCallback((k) => (e) => {
    const v = parseFloat(e.target.value)
    setInputs(p => ({ ...p, [k]: isNaN(v) ? 0 : v }))
  }, [])

  // Auto-derived
  const sppTotal = inputs.sppLiving + inputs.sppNonliving
  const k2 = DISTRICTS[inputs.districtIdx]?.k2 ?? 0.5

  // ─── Core calculations ───────────────────────────────────────────────────
  const calc = useMemo(() => {
    const { siteArea, flatsCount, flatsArea, sppNonliving, k1, otop } = inputs
    const avgFlat = flatsCount > 0 ? flatsArea / flatsCount : 0
    const popMethod = avgFlat < C.THRESHOLD ? 'flats' : 'area'
    const population = popMethod === 'flats'
      ? Math.ceil(flatsCount * C.PERS_PER_FLAT)
      : Math.ceil(flatsArea / C.S1)

    const permanent = Math.ceil(population * C.A * k1)
    const guest = Math.ceil(permanent * 0.1)
    const objectMM = Math.ceil((sppNonliving / 100) * k1 * k2)
    const totalMM = permanent + guest + objectMM
    const ezs = Math.ceil(totalMM * 0.05)

    const greenNorm = otop ? C.GREEN_REDUCED : C.GREEN_BASE
    const greenArea = Math.ceil(population * greenNorm)
    const playKids = Math.ceil(population * C.PLAYGROUND_KIDS)
    const playAdult = Math.ceil(population * C.PLAYGROUND_ADULT)
    const playSport = Math.ceil(population * C.PLAYGROUND_SPORT)
    const playEcon = Math.ceil(population * C.PLAYGROUND_ECON)

    const kpz = siteArea > 0 ? (sppTotal / 1000) / siteArea : 0

    return {
      avgFlat, popMethod, population,
      permanent, guest, objectMM, totalMM, ezs,
      greenNorm, greenArea, playKids, playAdult, playSport, playEcon,
      kpz,
    }
  }, [inputs, k2, sppTotal])

  // ─── Social infrastructure ───────────────────────────────────────────────
  const social = useMemo(() => {
    const dooRatio = inputs.zone === 'z1' ? C.RATIO_DOO_Z1 : C.RATIO_DOO_Z2
    const soshRatio = inputs.zone === 'z1' ? C.RATIO_SOSH_Z1 : C.RATIO_SOSH_Z2
    const dooNorm = Math.ceil(calc.population * dooRatio / 1000)
    const soshNorm = Math.ceil(calc.population * soshRatio / 1000)
    const polyNorm = Math.ceil(calc.population * (C.RATIO_POLY_KID + C.RATIO_POLY_ADULT) / 10)
    return { dooNorm, soshNorm, polyNorm, dooRatio, soshRatio }
  }, [calc.population, inputs.zone])

  // ─── City comparison ─────────────────────────────────────────────────────
  const cityCalc = useMemo(() => {
    const normKpz = cityDensity(inputs.siteArea)
    const normSpp = normKpz * inputs.siteArea * 1000
    const deltaKpz = calc.kpz - normKpz
    return { normKpz, normSpp, deltaKpz }
  }, [inputs.siteArea, calc.kpz])

  // ─── UPSS Compensation ───────────────────────────────────────────────────
  const upss = useMemo(() => {
    const deltaDoo = clamp(social.dooNorm - inputs.projDoo)
    const deltaSosh = clamp(social.soshNorm - inputs.projSosh)
    const deltaPoly = clamp(social.polyNorm - inputs.projPoly)
    const total = deltaDoo * C.COST_DOO + deltaSosh * C.COST_SOSH + deltaPoly * C.COST_POLY
    return { deltaDoo, deltaSosh, deltaPoly, total }
  }, [social, inputs.projDoo, inputs.projSosh, inputs.projPoly])

  // ─── Density curve data for chart ────────────────────────────────────────
  const densityCurve = useMemo(() => {
    const pts = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10, 12]
    return pts.map(a => ({ га: a, норма: +cityDensity(a).toFixed(1) }))
  }, [])

  // ─── Export Excel ────────────────────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const rows = [
      ['Показатель', 'Значение', 'Единица'],
      ['Площадь участка', inputs.siteArea, 'га'],
      ['Этажность', inputs.floors, 'эт.'],
      ['Количество квартир', inputs.flatsCount, 'шт.'],
      ['Общая площадь квартир', inputs.flatsArea, 'м²'],
      ['СПП жилая', inputs.sppLiving, 'м²'],
      ['СПП нежилая', inputs.sppNonliving, 'м²'],
      ['СПП всего', sppTotal, 'м²'],
      ['Средняя площадь квартиры', +calc.avgFlat.toFixed(1), 'м²'],
      ['Метод расчёта населения', calc.popMethod === 'flats' ? 'По квартирам (×2.1)' : 'По площади (÷33)', ''],
      ['Расчётное население', calc.population, 'чел.'],
      ['К1', inputs.k1, ''],
      ['К2', k2, ''],
      ['КПЗ / ФАР', +calc.kpz.toFixed(2), 'тыс.м²/га'],
      ['Норматив КПЗ', +cityCalc.normKpz.toFixed(1), 'тыс.м²/га'],
      ['ММ постоянные', calc.permanent, 'м/м'],
      ['ММ гостевые', calc.guest, 'м/м'],
      ['ММ объектные', calc.objectMM, 'м/м'],
      ['ММ всего', calc.totalMM, 'м/м'],
      ['ЭЗС (5%)', calc.ezs, 'м/м'],
      ['Норма озеленения', calc.greenNorm, 'м²/чел.'],
      ['Площадь озеленения', calc.greenArea, 'м²'],
      ['ДОО (норма)', social.dooNorm, 'мест'],
      ['ДОО (проект)', inputs.projDoo, 'мест'],
      ['СОШ (норма)', social.soshNorm, 'мест'],
      ['СОШ (проект)', inputs.projSosh, 'мест'],
      ['Поликлиника (норма)', social.polyNorm, 'пос./смену'],
      ['Поликлиника (проект)', inputs.projPoly, 'пос./смену'],
      ['Компенсация УПСС', upss.total, '₽'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ТЭП')
    XLSX.writeFile(wb, `ТЭП_${inputs.siteName || 'расчёт'}.xlsx`)
  }, [inputs, calc, social, upss, cityCalc, k2, sppTotal])

  // ─── Export PDF ──────────────────────────────────────────────────────────
  const exportPDF = useCallback(async () => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'),
      import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'),
    ])
    const el = printRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, w, h)
    pdf.save(`ТЭП_${inputs.siteName || 'расчёт'}.pdf`)
  }, [inputs.siteName])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app" ref={printRef}>
      <div className="header">
        <h1>ТЭП Калькулятор</h1>
        <span className="subtitle">945-ПП · РНГП Москвы · {inputs.siteName}</span>
      </div>

      <div className="export-row">
        <button className="btn" onClick={exportExcel}>Excel</button>
        <button className="btn" onClick={exportPDF}>PDF</button>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* ── Tab 0: Inputs ─────────────────────────────────────── */}
      {tab === 0 && (
        <div className="two-col">
          <div>
            <div className="form-section">
              <div className="section-label">Объект</div>
              <div className="field">
                <label>Название объекта</label>
                <input type="text" className="text-input" value={inputs.siteName}
                  onChange={e => set('siteName', e.target.value)} />
              </div>
              <div className="field">
                <label>Площадь участка, га</label>
                <input type="number" step="0.1" min="0.1" value={inputs.siteArea} onChange={setNum('siteArea')} />
              </div>
              <div className="field">
                <label>Этажность</label>
                <input type="number" step="1" min="1" value={inputs.floors} onChange={setNum('floors')} />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">СПП</div>
              <div className="field">
                <label>СПП жилая, м²</label>
                <input type="number" step="100" value={inputs.sppLiving} onChange={setNum('sppLiving')} />
              </div>
              <div className="field">
                <label>СПП нежилая, м²</label>
                <input type="number" step="100" value={inputs.sppNonliving} onChange={setNum('sppNonliving')} />
              </div>
              <div className="field">
                <label>СПП всего, м²</label>
                <div className="derived-value">{fmt(sppTotal)} м² <span style={{ fontSize: 11, color: '#999' }}>авто</span></div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Квартиры</div>
              <div className="field">
                <label>Количество квартир</label>
                <input type="number" step="1" min="0" value={inputs.flatsCount} onChange={setNum('flatsCount')} />
              </div>
              <div className="field">
                <label>Общая площадь квартир, м²</label>
                <input type="number" step="100" value={inputs.flatsArea} onChange={setNum('flatsArea')} />
              </div>
              <div className="field">
                <label>Средняя площадь квартиры</label>
                <div className="derived-value">
                  {fmt(calc.avgFlat, 1)} м²
                  <span className="method-tag">{calc.popMethod === 'flats' ? '< 69.3 → ×2.1' : '≥ 69.3 → ÷33'}</span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Коэффициенты</div>
              <div className="field">
                <label>K1 — транспортная доступность</label>
                <select value={inputs.k1} onChange={e => set('k1', parseFloat(e.target.value))}>
                  <option value={0.75}>0.75 — отличная (метро ≤500 м)</option>
                  <option value={0.90}>0.90 — хорошая (метро ≤1000 м)</option>
                  <option value={1.00}>1.00 — стандартная</option>
                </select>
              </div>
              <div className="field">
                <label>
                  K2 — деловая активность района
                  <button className="btn" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 8, verticalAlign: 'middle' }}
                    onClick={() => setShowMap(true)}>Изменить</button>
                </label>
                <div className="derived-value">
                  {DISTRICTS[inputs.districtIdx]?.name}
                  <span className="method-tag">K2 = {k2}</span>
                </div>
              </div>
              <div className="field">
                <label>Зона соц. нормирования</label>
                <select value={inputs.zone} onChange={e => set('zone', e.target.value)}>
                  <option value="z1">Зона 1 (ДОО 44‰, СОШ 90‰)</option>
                  <option value="z2">Зона 2 (ДОО 63‰, СОШ 124‰)</option>
                </select>
              </div>
              <div className="field">
                <div className="toggle-row">
                  <label className="toggle">
                    <input type="checkbox" checked={inputs.otop} onChange={e => set('otop', e.target.checked)} />
                    <span className="toggle-track"></span>
                    <span className="toggle-thumb"></span>
                  </label>
                  <span className="toggle-label" onClick={() => set('otop', !inputs.otop)}>
                    ОТОП — норма озеленения {inputs.otop ? '4.25' : '5.0'} м²/чел.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="block-title">Расчётные показатели</div>
            <div className="kpi-grid">
              <div className="kpi-card dark">
                <div className="kpi-label">Население</div>
                <div className="kpi-value">{fmt(calc.population)}</div>
                <div className="kpi-unit">чел. · {calc.popMethod === 'flats' ? 'кв.×2.1' : 'пл.÷33'}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">КПЗ / ФАР</div>
                <div className="kpi-value">{fmt(calc.kpz, 2)}</div>
                <div className="kpi-unit">тыс.м²/га</div>
                <Delta val={calc.kpz} norm={cityCalc.normKpz} unit="тыс.м²/га" />
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Паркинг всего</div>
                <div className="kpi-value">{fmt(calc.totalMM)}</div>
                <div className="kpi-unit">м/м · ЭЗС {fmt(calc.ezs)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Озеленение</div>
                <div className="kpi-value">{fmt(calc.greenArea)}</div>
                <div className="kpi-unit">м²</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">ДОО / СОШ</div>
                <div className="kpi-value">{fmt(social.dooNorm)}<span style={{ fontSize: 16, fontWeight: 300, color: '#999' }}> / {fmt(social.soshNorm)}</span></div>
                <div className="kpi-unit">мест</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">УПСС</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{(upss.total / 1e6).toFixed(1)}</div>
                <div className="kpi-unit">млн ₽</div>
              </div>
            </div>

            <div className="block-title" style={{ marginTop: 24 }}>СПП структура</div>
            <SimpleBar data={[
              { name: 'Жилая', 'факт': inputs.sppLiving },
              { name: 'Нежилая', 'факт': inputs.sppNonliving },
              { name: 'Всего', 'факт': sppTotal, 'норма': Math.round(cityCalc.normSpp) },
            ]} />
          </div>
        </div>
      )}

      {/* ── Tab 1: Dashboard ──────────────────────────────────── */}
      {tab === 1 && (
        <div>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="kpi-card dark">
              <div className="kpi-label">Население</div>
              <div className="kpi-value">{fmt(calc.population)}</div>
              <div className="kpi-unit">{calc.popMethod === 'flats' ? 'квартиры × 2.1' : 'площадь ÷ 33'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">КПЗ / ФАР</div>
              <div className="kpi-value">{fmt(calc.kpz, 2)}</div>
              <div className="kpi-unit">норма {fmt(cityCalc.normKpz, 1)} тыс.м²/га</div>
              <Delta val={calc.kpz} norm={cityCalc.normKpz} unit="тыс.м²/га" />
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Паркинг</div>
              <div className="kpi-value">{fmt(calc.totalMM)}</div>
              <div className="kpi-unit">м/м всего</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">ЭЗС (5%)</div>
              <div className="kpi-value">{fmt(calc.ezs)}</div>
              <div className="kpi-unit">электрозарядных</div>
            </div>
          </div>

          <div className="two-col" style={{ marginTop: 32 }}>
            <div>
              <div className="block-title">Парковка по категориям</div>
              <SimpleBar data={[
                { name: 'Постоян.', 'факт': calc.permanent },
                { name: 'Гостевые', 'факт': calc.guest },
                { name: 'Объектные', 'факт': calc.objectMM },
                { name: 'ЭЗС', 'факт': calc.ezs },
              ]} />
            </div>
            <div>
              <div className="block-title">Норматив vs проект</div>
              <div className="compare-row">
                <span className="compare-label">КПЗ / ФАР</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(calc.kpz, 2)}</span>
                  <span className="compare-norm">норма {fmt(cityCalc.normKpz, 1)}</span>
                  <span className={`compare-delta ${cityCalc.deltaKpz > 0 ? 'over' : 'ok'}`}>
                    {cityCalc.deltaKpz > 0 ? '+' : ''}{fmt(cityCalc.deltaKpz, 2)}
                  </span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">Население</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(calc.population)}</span>
                  <span className="compare-norm">чел.</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">Озеленение</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(calc.greenArea)}</span>
                  <span className="compare-norm">норма {calc.greenNorm} м²/чел.</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">ДОО</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(social.dooNorm)}</span>
                  <span className="compare-norm">{social.dooRatio}‰</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">СОШ</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(social.soshNorm)}</span>
                  <span className="compare-norm">{social.soshRatio}‰</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">УПСС</span>
                <div className="compare-values">
                  <span className="compare-your" style={{ fontSize: 16 }}>{(upss.total / 1e6).toFixed(1)} млн</span>
                  <span className="compare-norm">₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Parking ────────────────────────────────────── */}
      {tab === 2 && (
        <div>
          <div className="block">
            <div className="block-title">Расчёт машино-мест (945-ПП)</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Формула</th>
                  <th>Значение</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Население</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {calc.popMethod === 'flats'
                      ? `${fmt(inputs.flatsCount)} кв. × 2.1`
                      : `${fmt(inputs.flatsArea)} м² ÷ 33`}
                  </td>
                  <td><span className="num">{fmt(calc.population)}</span> <span className="norm">чел.</span></td>
                </tr>
                <tr>
                  <td>ММ постоянные</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {fmt(calc.population)} × 0.257 × {inputs.k1}
                  </td>
                  <td><span className="num">{fmt(calc.permanent)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr>
                  <td>ММ гостевые</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {fmt(calc.permanent)} × 10%
                  </td>
                  <td><span className="num">{fmt(calc.guest)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr>
                  <td>ММ объектные</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    ({fmt(inputs.sppNonliving)} ÷ 100) × {inputs.k1} × {k2}
                  </td>
                  <td><span className="num">{fmt(calc.objectMM)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr style={{ borderTop: '2px solid #111' }}>
                  <td><strong>Итого ММ</strong></td>
                  <td style={{ color: '#555', fontSize: 12 }}>{fmt(calc.permanent)} + {fmt(calc.guest)} + {fmt(calc.objectMM)}</td>
                  <td><span className="num" style={{ fontSize: 24 }}>{fmt(calc.totalMM)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr>
                  <td>ЭЗС</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {fmt(calc.totalMM)} × 5%
                  </td>
                  <td><span className="num">{fmt(calc.ezs)}</span> <span className="norm">ЭЗС</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="block">
            <div className="block-title">Коэффициенты</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'K1 — Транспортная доступность', val: inputs.k1,
                  desc: inputs.k1 === 0.75 ? 'Отличная (метро ≤500 м)' : inputs.k1 === 0.90 ? 'Хорошая (метро ≤1000 м)' : 'Стандартная' },
                { label: 'K2 — Деловая активность', val: k2,
                  desc: DISTRICTS[inputs.districtIdx]?.name },
              ].map(c => (
                <div key={c.label} style={{ padding: 16, border: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 200 }}>{c.val}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="block">
            <div className="block-title">Структура паркинга</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Постоянные', значение: calc.permanent },
                { name: 'Гостевые', значение: calc.guest },
                { name: 'Объектные', значение: calc.objectMM },
                { name: 'ЭЗС', значение: calc.ezs },
              ]} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                <Bar dataKey="значение" fill="#111" radius={[2, 2, 0, 0]}
                  label={{ position: 'top', fontSize: 11, fontFamily: 'Inter', fill: '#555' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tab 3: Greening ───────────────────────────────────── */}
      {tab === 3 && (
        <div>
          <div className="block">
            <div className="block-title">Озеленение и благоустройство</div>
            <table className="data-table">
              <thead>
                <tr><th>Элемент</th><th>Норма</th><th>Потребность</th></tr>
              </thead>
              <tbody>
                {[
                  { label: 'Озеленение территории', norm: `${calc.greenNorm} м²/чел.${inputs.otop ? ' (ОТОП)' : ''}`, val: calc.greenArea, unit: 'м²' },
                  { label: 'Детские площадки', norm: `${C.PLAYGROUND_KIDS} м²/чел.`, val: calc.playKids, unit: 'м²' },
                  { label: 'Площадки для взрослых', norm: `${C.PLAYGROUND_ADULT} м²/чел.`, val: calc.playAdult, unit: 'м²' },
                  { label: 'Спортивные площадки', norm: `${C.PLAYGROUND_SPORT} м²/чел.`, val: calc.playSport, unit: 'м²' },
                  { label: 'Хозяйственные площадки', norm: `${C.PLAYGROUND_ECON} м²/чел.`, val: calc.playEcon, unit: 'м²' },
                ].map(r => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="norm">{r.norm}</td>
                    <td><span className="num">{fmt(r.val)}</span> <span className="norm">{r.unit}</span></td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                  <td><strong>Итого благоустройство</strong></td>
                  <td></td>
                  <td><span className="num" style={{ fontSize: 20 }}>
                    {fmt(calc.greenArea + calc.playKids + calc.playAdult + calc.playSport + calc.playEcon)}
                  </span> <span className="norm">м²</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="block">
            <div className="block-title">Потребность в благоустройстве</div>
            <SimpleBar height={240} data={[
              { name: 'Озеленение', 'факт': calc.greenArea },
              { name: 'Детские', 'факт': calc.playKids },
              { name: 'Взрослые', 'факт': calc.playAdult },
              { name: 'Спорт', 'факт': calc.playSport },
              { name: 'Хоз.', 'факт': calc.playEcon },
            ]} />
          </div>
        </div>
      )}

      {/* ── Tab 4: Social ─────────────────────────────────────── */}
      {tab === 4 && (
        <div>
          <div className="block">
            <div className="block-title">Социальная инфраструктура</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Объект</th>
                  <th>Норматив</th>
                  <th>Потребность</th>
                  <th>Проект предусматривает</th>
                  <th>Дефицит</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ДОО (детский сад)</td>
                  <td className="norm">{social.dooRatio}‰</td>
                  <td><span className="num">{fmt(social.dooNorm)}</span> <span className="norm">мест</span></td>
                  <td>
                    <input type="number" step="10" min="0" value={inputs.projDoo} onChange={setNum('projDoo')}
                      style={{ width: 90, height: 32, padding: '0 8px', border: '1px solid #e0e0e0', fontFamily: 'Inter', fontSize: 14 }} />
                  </td>
                  <td>
                    {upss.deltaDoo > 0
                      ? <span style={{ color: '#c41a00', fontWeight: 500 }}>−{fmt(upss.deltaDoo)}</span>
                      : <span className="badge ok">закрыто</span>}
                  </td>
                </tr>
                <tr>
                  <td>СОШ (школа)</td>
                  <td className="norm">{social.soshRatio}‰</td>
                  <td><span className="num">{fmt(social.soshNorm)}</span> <span className="norm">мест</span></td>
                  <td>
                    <input type="number" step="10" min="0" value={inputs.projSosh} onChange={setNum('projSosh')}
                      style={{ width: 90, height: 32, padding: '0 8px', border: '1px solid #e0e0e0', fontFamily: 'Inter', fontSize: 14 }} />
                  </td>
                  <td>
                    {upss.deltaSosh > 0
                      ? <span style={{ color: '#c41a00', fontWeight: 500 }}>−{fmt(upss.deltaSosh)}</span>
                      : <span className="badge ok">закрыто</span>}
                  </td>
                </tr>
                <tr>
                  <td>Поликлиника</td>
                  <td className="norm">{C.RATIO_POLY_KID + C.RATIO_POLY_ADULT}/10 чел.</td>
                  <td><span className="num">{fmt(social.polyNorm)}</span> <span className="norm">пос./смену</span></td>
                  <td>
                    <input type="number" step="10" min="0" value={inputs.projPoly} onChange={setNum('projPoly')}
                      style={{ width: 90, height: 32, padding: '0 8px', border: '1px solid #e0e0e0', fontFamily: 'Inter', fontSize: 14 }} />
                  </td>
                  <td>
                    {upss.deltaPoly > 0
                      ? <span style={{ color: '#c41a00', fontWeight: 500 }}>−{fmt(upss.deltaPoly)}</span>
                      : <span className="badge ok">закрыто</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="block">
            <div className="block-title">Компенсация УПСС</div>
            <div className="upss-total">{(upss.total / 1e6).toFixed(1)} млн ₽</div>
            <div className="upss-label">расчётная компенсация за необеспеченную инфраструктуру</div>
            <div style={{ marginTop: 24 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'ДОО', норма: social.dooNorm, проект: inputs.projDoo, дефицит: upss.deltaDoo },
                  { name: 'СОШ', норма: social.soshNorm, проект: inputs.projSosh, дефицит: upss.deltaSosh },
                  { name: 'Поликлиника', норма: social.polyNorm, проект: inputs.projPoly, дефицит: upss.deltaPoly },
                ]} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                  <Bar dataKey="норма" fill="#e0e0e0" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="проект" fill="#111" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="дефицит" fill="#c41a00" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0' }}>
              {[
                { label: 'ДОО', val: upss.deltaDoo * C.COST_DOO },
                { label: 'СОШ', val: upss.deltaSosh * C.COST_SOSH },
                { label: 'Поликлиника', val: upss.deltaPoly * C.COST_POLY },
              ].map(r => (
                <div key={r.label} style={{ background: '#fff', padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 200, color: r.val > 0 ? '#c41a00' : '#111' }}>{(r.val / 1e6).toFixed(1)} млн ₽</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 5: Comparison ─────────────────────────────────── */}
      {tab === 5 && (
        <div>
          <div className="block">
            <div className="block-title">Сравнение с городским нормативом РНГП</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.7 }}>
              Нормативная плотность для участка <strong>{inputs.siteArea} га</strong> составляет{' '}
              <strong>{fmt(cityCalc.normKpz, 1)} тыс.м²/га</strong> (нормативная СПП {fmt(cityCalc.normSpp)} м²).
              Фактическая КПЗ проекта — <strong style={{ color: cityCalc.deltaKpz > 0 ? '#c41a00' : '#111' }}>{fmt(calc.kpz, 2)} тыс.м²/га</strong>.
            </p>

            {[
              { label: 'КПЗ / ФАР проекта', val: fmt(calc.kpz, 2), unit: 'тыс.м²/га', norm: fmt(cityCalc.normKpz, 1), over: cityCalc.deltaKpz > 0, delta: fmt(Math.abs(cityCalc.deltaKpz), 2) },
              { label: 'СПП фактическая', val: fmt(sppTotal), unit: 'м²', norm: fmt(cityCalc.normSpp), over: sppTotal > cityCalc.normSpp, delta: fmt(Math.abs(sppTotal - cityCalc.normSpp)) },
              { label: 'Паркинг всего', val: fmt(calc.totalMM), unit: 'м/м', norm: '—', over: false, delta: null },
              { label: 'Озеленение', val: fmt(calc.greenArea), unit: 'м²', norm: `${calc.greenNorm} м²/чел.`, over: false, delta: null },
            ].map(r => (
              <div key={r.label} className="compare-row">
                <span className="compare-label">{r.label}</span>
                <div className="compare-values">
                  <span className="compare-your">{r.val}</span>
                  <span className="compare-norm">{r.unit} · норма {r.norm}</span>
                  {r.delta && (
                    <span className={`compare-delta ${r.over ? 'over' : 'ok'}`}>
                      {r.over ? '▲' : '▼'} {r.delta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-title">Кривая нормативной плотности (КПЗ от площади участка)</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={densityCurve} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="га" tickFormatter={v => v + ' га'} tick={{ fontSize: 10, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v} tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} width={32}
                  label={{ value: 'тыс.м²/га', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#999', dx: -4 }} />
                <Tooltip
                  formatter={(v) => [v + ' тыс.м²/га', 'Норматив']}
                  contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }}
                  cursor={{ stroke: '#ccc', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="норма" stroke="#111" strokeWidth={2} dot={false} />
                <ReferenceDot
                  x={inputs.siteArea}
                  y={+calc.kpz.toFixed(1)}
                  r={6}
                  fill={cityCalc.deltaKpz > 0 ? '#c41a00' : '#111'}
                  stroke="#fff"
                  strokeWidth={2}
                  label={{ value: 'Проект', position: 'top', fontSize: 11, fontFamily: 'Inter', fill: cityCalc.deltaKpz > 0 ? '#c41a00' : '#555' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showMap && (
        <MapModal
          onClose={() => setShowMap(false)}
          selectedDistrict={inputs.districtIdx}
          onSelect={idx => set('districtIdx', idx)}
        />
      )}
    </div>
  )
}
