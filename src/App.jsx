import { useState, useMemo, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
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

const fmt = (n, d = 0) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—')
const fmtM = (n) => fmt(n, 0) + ' ₽'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Исходные', 'Дашборд', 'Парковка', 'Озеленение', 'Соц. инфра', 'Сравнение']

// ─── Delta component ─────────────────────────────────────────────────────────
function Delta({ val, norm, unit = '', invert = false }) {
  if (!norm || !isFinite(val)) return null
  const diff = val - norm
  const over = invert ? diff < 0 : diff > 0
  const sign = diff > 0 ? '+' : ''
  return (
    <span className={`delta ${over ? 'over' : 'ok'}`}>
      {sign}{fmt(diff, 1)} {unit} от норматива
    </span>
  )
}

// ─── Bar chart label ──────────────────────────────────────────────────────────
function SimpleBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }}
          cursor={{ fill: '#f0f0f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }} />
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
        <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
          Коэффициент K2 определяет деловую активность района и применяется к объектной парковке.
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

  // Inputs
  const [inputs, setInputs] = useState({
    siteName: 'Жилой комплекс',
    siteArea: 2.5,       // га
    floors: 17,
    flatsCount: 350,
    flatsArea: 22500,    // м²
    sppLiving: 25000,    // м²
    sppNonliving: 3000,  // м²
    sppTotal: 28000,     // м²
    k1: 0.9,
    districtIdx: 1,
    otop: false,
    zone: 'z1',          // z1 / z2 for social norms
  })

  const set = useCallback((k, v) => setInputs(p => ({ ...p, [k]: v })), [])
  const setNum = useCallback((k) => (e) => {
    const v = parseFloat(e.target.value)
    setInputs(p => ({ ...p, [k]: isNaN(v) ? 0 : v }))
  }, [])

  const k2 = DISTRICTS[inputs.districtIdx]?.k2 ?? 0.5

  // ─── Core calculations ───────────────────────────────────────────────────
  const calc = useMemo(() => {
    const { siteArea, flatsCount, flatsArea, sppNonliving, k1, otop } = inputs
    const avgFlat = flatsCount > 0 ? flatsArea / flatsCount : 0
    const popMethod = avgFlat < C.THRESHOLD ? 'flats' : 'area'
    const population = popMethod === 'flats'
      ? Math.ceil(flatsCount * C.PERS_PER_FLAT)
      : Math.ceil(flatsArea / C.S1)

    // Parking
    const permanent = Math.ceil(population * C.A * k1)
    const guest = Math.ceil(permanent * 0.1)
    const objectMM = Math.ceil((sppNonliving / 100) * k1 * k2)
    const totalMM = permanent + guest + objectMM
    const ezs = Math.ceil(totalMM * 0.05)

    // Greening
    const greenNorm = otop ? C.GREEN_REDUCED : C.GREEN_BASE
    const greenArea = Math.ceil(population * greenNorm)
    const playKids = Math.ceil(population * C.PLAYGROUND_KIDS)
    const playAdult = Math.ceil(population * C.PLAYGROUND_ADULT)
    const playSport = Math.ceil(population * C.PLAYGROUND_SPORT)
    const playEcon = Math.ceil(population * C.PLAYGROUND_ECON)

    // Density
    const kpz = siteArea > 0 ? (inputs.sppTotal / 1000) / siteArea : 0 // тыс.м²/га
    const far = kpz  // КПЗ = ФАР

    return {
      avgFlat, popMethod, population,
      permanent, guest, objectMM, totalMM, ezs,
      greenNorm, greenArea, playKids, playAdult, playSport, playEcon,
      kpz, far,
    }
  }, [inputs, k2])

  // ─── Social infrastructure ───────────────────────────────────────────────
  const social = useMemo(() => {
    const { population, zone } = { population: calc.population, zone: inputs.zone }
    const dooRatio = inputs.zone === 'z1' ? C.RATIO_DOO_Z1 : C.RATIO_DOO_Z2
    const soshRatio = inputs.zone === 'z1' ? C.RATIO_SOSH_Z1 : C.RATIO_SOSH_Z2
    const dooNorm = Math.ceil(population * dooRatio / 1000)
    const soshNorm = Math.ceil(population * soshRatio / 1000)
    const polyNorm = Math.ceil(population * (C.RATIO_POLY_KID + C.RATIO_POLY_ADULT) / 10)
    return { dooNorm, soshNorm, polyNorm, dooRatio, soshRatio }
  }, [calc.population, inputs.zone])

  // ─── City comparison ─────────────────────────────────────────────────────
  const cityCalc = useMemo(() => {
    const normKpz = cityDensity(inputs.siteArea)
    const normSpp = normKpz * inputs.siteArea * 1000  // м²
    const deltaKpz = calc.kpz - normKpz
    return { normKpz, normSpp, deltaKpz }
  }, [inputs.siteArea, calc.kpz])

  // ─── UPSS Compensation ───────────────────────────────────────────────────
  const upss = useMemo(() => {
    const { dooNorm, soshNorm, polyNorm } = social
    // Assuming project provides 0 — delta = full norm
    const deltaDoo = dooNorm
    const deltaSosh = soshNorm
    const deltaPoly = polyNorm
    const total = deltaDoo * C.COST_DOO + deltaSosh * C.COST_SOSH + deltaPoly * C.COST_POLY
    return { deltaDoo, deltaSosh, deltaPoly, total }
  }, [social])

  // ─── Export Excel ────────────────────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const data = [
      ['Показатель', 'Значение', 'Единица'],
      ['Площадь участка', inputs.siteArea, 'га'],
      ['Этажность', inputs.floors, 'эт.'],
      ['Количество квартир', inputs.flatsCount, 'шт.'],
      ['Общая площадь квартир', inputs.flatsArea, 'м²'],
      ['СПП всего', inputs.sppTotal, 'м²'],
      ['СПП жилая', inputs.sppLiving, 'м²'],
      ['СПП нежилая', inputs.sppNonliving, 'м²'],
      ['Средняя площадь квартиры', fmt(calc.avgFlat, 1), 'м²'],
      ['Метод расчёта населения', calc.popMethod === 'flats' ? 'По квартирам' : 'По площади', ''],
      ['Расчётное население', calc.population, 'чел.'],
      ['К1', inputs.k1, ''],
      ['К2', k2, ''],
      ['КПЗ / ФАР', fmt(calc.kpz, 2), 'тыс.м²/га'],
      ['Норматив КПЗ', fmt(cityCalc.normKpz, 1), 'тыс.м²/га'],
      ['ММ постоянные', calc.permanent, 'м/м'],
      ['ММ гостевые', calc.guest, 'м/м'],
      ['ММ объектные', calc.objectMM, 'м/м'],
      ['ММ всего', calc.totalMM, 'м/м'],
      ['ЭЗС (5%)', calc.ezs, 'м/м'],
      ['Норма озеленения', calc.greenNorm, 'м²/чел.'],
      ['Площадь озеленения', calc.greenArea, 'м²'],
      ['ДОО', social.dooNorm, 'мест'],
      ['СОШ', social.soshNorm, 'мест'],
      ['Поликлиника', social.polyNorm, 'пос./смену'],
      ['Компенсация УПСС', upss.total, '₽'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ТЭП')
    XLSX.writeFile(wb, `ТЭП_${inputs.siteName || 'расчёт'}.xlsx`)
  }, [inputs, calc, social, upss, cityCalc, k2])

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
      {/* Header */}
      <div className="header">
        <h1>ТЭП Калькулятор</h1>
        <span className="subtitle">945-ПП · РНГП Москвы · {inputs.siteName}</span>
      </div>

      {/* Export */}
      <div className="export-row">
        <button className="btn" onClick={exportExcel}>Excel</button>
        <button className="btn" onClick={exportPDF}>PDF</button>
      </div>

      {/* Tabs */}
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
                <input type="text" value={inputs.siteName}
                  onChange={e => set('siteName', e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #e0e0e0', fontFamily: 'Inter', fontSize: 14 }} />
              </div>
              <div className="field">
                <label>Площадь участка, га</label>
                <input type="number" step="0.1" value={inputs.siteArea} onChange={setNum('siteArea')} />
              </div>
              <div className="field">
                <label>Этажность</label>
                <input type="number" step="1" value={inputs.floors} onChange={setNum('floors')} />
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
                <input type="number" step="100" value={inputs.sppTotal} onChange={setNum('sppTotal')} />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Квартиры</div>
              <div className="field">
                <label>Количество квартир</label>
                <input type="number" step="1" value={inputs.flatsCount} onChange={setNum('flatsCount')} />
              </div>
              <div className="field">
                <label>Общая площадь квартир, м²</label>
                <input type="number" step="100" value={inputs.flatsArea} onChange={setNum('flatsArea')} />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Коэффициенты</div>
              <div className="field">
                <label>K1 — транспортная доступность</label>
                <select value={inputs.k1} onChange={e => set('k1', parseFloat(e.target.value))}>
                  <option value={0.75}>0.75 — отличная (метро до 500 м)</option>
                  <option value={0.90}>0.90 — хорошая (метро до 1000 м)</option>
                  <option value={1.00}>1.00 — стандартная</option>
                </select>
              </div>
              <div className="field">
                <label>
                  K2 — деловая активность района{' '}
                  <button className="btn" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 4 }}
                    onClick={() => setShowMap(true)}>Выбрать район</button>
                </label>
                <div style={{ padding: '8px 10px', background: '#f0f0f0', fontSize: 14, fontWeight: 200 }}>
                  {DISTRICTS[inputs.districtIdx]?.name} — K2 = {k2}
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
                  <span className="toggle-label">ОТОП (снижение нормы озеленения до 4.25 м²/чел.)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick summary */}
          <div>
            <div className="block-title">Расчётные показатели</div>
            <div className="kpi-grid">
              <div className="kpi-card dark">
                <div className="kpi-label">Население</div>
                <div className="kpi-value">{fmt(calc.population)}</div>
                <div className="kpi-unit">чел.
                  <span className="method-tag">{calc.popMethod === 'flats' ? '×2.1' : '÷33'}</span>
                </div>
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
                <div className="kpi-unit">м/м</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Озеленение</div>
                <div className="kpi-value">{fmt(calc.greenArea)}</div>
                <div className="kpi-unit">м²</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">ДОО</div>
                <div className="kpi-value">{fmt(social.dooNorm)}</div>
                <div className="kpi-unit">мест</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">УПСС</div>
                <div className="kpi-value" style={{ fontSize: 18 }}>{(upss.total / 1e6).toFixed(0)} млн</div>
                <div className="kpi-unit">₽</div>
              </div>
            </div>

            <div className="block-title" style={{ marginTop: 24 }}>СПП структура</div>
            <SimpleBar data={[
              { name: 'Жилая', 'факт': inputs.sppLiving, 'норма': 0 },
              { name: 'Нежилая', 'факт': inputs.sppNonliving, 'норма': 0 },
              { name: 'Всего', 'факт': inputs.sppTotal, 'норма': cityCalc.normSpp },
            ]} />
          </div>
        </div>
      )}

      {/* ── Tab 1: Dashboard ──────────────────────────────────── */}
      {tab === 1 && (
        <div>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
            <div className="kpi-card dark">
              <div className="kpi-label">Население</div>
              <div className="kpi-value">{fmt(calc.population)}</div>
              <div className="kpi-unit">чел. · {calc.popMethod === 'flats' ? 'квартиры×2.1' : 'пл.÷33'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">КПЗ</div>
              <div className="kpi-value">{fmt(calc.kpz, 2)}</div>
              <div className="kpi-unit">тыс.м²/га · норма {fmt(cityCalc.normKpz, 1)}</div>
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

          <div className="two-col">
            <div>
              <div className="block-title">Парковка по категориям</div>
              <SimpleBar data={[
                { name: 'Постоян.', 'факт': calc.permanent },
                { name: 'Гостевые', 'факт': calc.guest },
                { name: 'Объектные', 'факт': calc.objectMM },
              ]} />
            </div>
            <div>
              <div className="block-title">Сравнение с нормой</div>
              <div className="compare-row">
                <span className="compare-label">КПЗ / ФАР</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(calc.kpz, 2)}</span>
                  <span className="compare-norm">норма {fmt(cityCalc.normKpz, 1)} тыс.м²/га</span>
                  <span className={`compare-delta ${cityCalc.deltaKpz > 0 ? 'over' : 'ok'}`}>
                    {cityCalc.deltaKpz > 0 ? '+' : ''}{fmt(cityCalc.deltaKpz, 2)}
                  </span>
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
                  <span className="compare-norm">{social.dooRatio}‰ от нас.</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">СОШ</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(social.soshNorm)}</span>
                  <span className="compare-norm">{social.soshRatio}‰ от нас.</span>
                </div>
              </div>
              <div className="compare-row">
                <span className="compare-label">Поликлиника</span>
                <div className="compare-values">
                  <span className="compare-your">{fmt(social.polyNorm)}</span>
                  <span className="compare-norm">пос./смену</span>
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
                      ? `${inputs.flatsCount} кв. × 2.1`
                      : `${fmt(inputs.flatsArea)} м² ÷ 33`}
                  </td>
                  <td><span className="num">{fmt(calc.population)}</span> <span className="norm">чел.</span></td>
                </tr>
                <tr>
                  <td>ММ постоянные</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>
                    {fmt(calc.population)} × 0.257 × K1({inputs.k1})
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
                    ({fmt(inputs.sppNonliving)} ÷ 100) × K1({inputs.k1}) × K2({k2})
                  </td>
                  <td><span className="num">{fmt(calc.objectMM)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr style={{ borderTop: '2px solid #111', fontWeight: 500 }}>
                  <td><strong>Итого ММ</strong></td>
                  <td>{fmt(calc.permanent)} + {fmt(calc.guest)} + {fmt(calc.objectMM)}</td>
                  <td><span className="num" style={{ fontSize: 24 }}>{fmt(calc.totalMM)}</span> <span className="norm">м/м</span></td>
                </tr>
                <tr>
                  <td>ЭЗС (5% от итого)</td>
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
              <div style={{ padding: 16, border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', marginBottom: 8 }}>K1 — Транспортная доступность</div>
                <div style={{ fontSize: 28, fontWeight: 200 }}>{inputs.k1}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  {inputs.k1 === 0.75 ? 'Отличная (метро ≤500 м)' : inputs.k1 === 0.90 ? 'Хорошая (метро ≤1000 м)' : 'Стандартная'}
                </div>
              </div>
              <div style={{ padding: 16, border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', marginBottom: 8 }}>K2 — Деловая активность</div>
                <div style={{ fontSize: 28, fontWeight: 200 }}>{k2}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{DISTRICTS[inputs.districtIdx]?.name}</div>
              </div>
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
                <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                <Bar dataKey="значение" fill="#111" radius={[2, 2, 0, 0]} />
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
                <tr>
                  <td>Озеленение территории</td>
                  <td className="norm">{calc.greenNorm} м²/чел. {inputs.otop && <span className="badge ok">ОТОП</span>}</td>
                  <td><span className="num">{fmt(calc.greenArea)}</span> <span className="norm">м²</span></td>
                </tr>
                <tr>
                  <td>Детские площадки</td>
                  <td className="norm">{C.PLAYGROUND_KIDS} м²/чел.</td>
                  <td><span className="num">{fmt(calc.playKids)}</span> <span className="norm">м²</span></td>
                </tr>
                <tr>
                  <td>Площадки для взрослых</td>
                  <td className="norm">{C.PLAYGROUND_ADULT} м²/чел.</td>
                  <td><span className="num">{fmt(calc.playAdult)}</span> <span className="norm">м²</span></td>
                </tr>
                <tr>
                  <td>Спортивные площадки</td>
                  <td className="norm">{C.PLAYGROUND_SPORT} м²/чел.</td>
                  <td><span className="num">{fmt(calc.playSport)}</span> <span className="norm">м²</span></td>
                </tr>
                <tr>
                  <td>Хоз. площадки</td>
                  <td className="norm">{C.PLAYGROUND_ECON} м²/чел.</td>
                  <td><span className="num">{fmt(calc.playEcon)}</span> <span className="norm">м²</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="block">
            <div className="block-title">Потребность в озеленении</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                { name: 'Озеленение', значение: calc.greenArea },
                { name: 'Детские', значение: calc.playKids },
                { name: 'Взрослые', значение: calc.playAdult },
                { name: 'Спорт', значение: calc.playSport },
                { name: 'Хоз.', значение: calc.playEcon },
              ]} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                <Bar dataKey="значение" fill="#111" radius={[2, 2, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#555' }} />
              </BarChart>
            </ResponsiveContainer>
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
                <tr><th>Объект</th><th>Норматив</th><th>Потребность</th><th>Стоимость УПСС</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>ДОО (детский сад)</td>
                  <td className="norm">{social.dooRatio}‰ от населения</td>
                  <td><span className="num">{fmt(social.dooNorm)}</span> <span className="norm">мест</span></td>
                  <td><span className="norm">{fmtM(upss.deltaDoo * C.COST_DOO)}</span></td>
                </tr>
                <tr>
                  <td>СОШ (школа)</td>
                  <td className="norm">{social.soshRatio}‰ от населения</td>
                  <td><span className="num">{fmt(social.soshNorm)}</span> <span className="norm">мест</span></td>
                  <td><span className="norm">{fmtM(upss.deltaSosh * C.COST_SOSH)}</span></td>
                </tr>
                <tr>
                  <td>Поликлиника</td>
                  <td className="norm">{C.RATIO_POLY_KID + C.RATIO_POLY_ADULT} пос./смену·1000 чел.</td>
                  <td><span className="num">{fmt(social.polyNorm)}</span> <span className="norm">пос./смену</span></td>
                  <td><span className="norm">{fmtM(upss.deltaPoly * C.COST_POLY)}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="block">
            <div className="block-title">Компенсация УПСС</div>
            <div className="upss-total">{(upss.total / 1e6).toFixed(1)} млн ₽</div>
            <div className="upss-label">совокупная расчётная компенсация при дефиците всей инфраструктуры</div>
            <div style={{ marginTop: 24 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'ДОО', сумма: upss.deltaDoo * C.COST_DOO / 1e6 },
                  { name: 'СОШ', сумма: upss.deltaSosh * C.COST_SOSH / 1e6 },
                  { name: 'Поликлиника', сумма: upss.deltaPoly * C.COST_POLY / 1e6 },
                ]} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => v + ' млн'} tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => v.toFixed(1) + ' млн ₽'} contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                  <Bar dataKey="сумма" fill="#111" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 5: Comparison ─────────────────────────────────── */}
      {tab === 5 && (
        <div>
          <div className="block">
            <div className="block-title">Сравнение с городским нормативом</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
              Расчёт плотности застройки выполнен по функции 945-ПП для участка {inputs.siteArea} га.
              Нормативная КПЗ = <strong>{fmt(cityCalc.normKpz, 1)}</strong> тыс.м²/га.
            </p>

            <div className="compare-row">
              <span className="compare-label">КПЗ / ФАР проекта</span>
              <div className="compare-values">
                <span className="compare-your">{fmt(calc.kpz, 2)}</span>
                <span className="compare-norm">тыс.м²/га</span>
                <span className={`compare-delta ${cityCalc.deltaKpz > 0 ? 'over' : 'ok'}`}>
                  {cityCalc.deltaKpz > 0 ? '▲' : '▼'} {fmt(Math.abs(cityCalc.deltaKpz), 2)} от нормы
                </span>
              </div>
            </div>

            <div className="compare-row">
              <span className="compare-label">Норматив КПЗ для площади {inputs.siteArea} га</span>
              <div className="compare-values">
                <span className="compare-your">{fmt(cityCalc.normKpz, 1)}</span>
                <span className="compare-norm">тыс.м²/га</span>
              </div>
            </div>

            <div className="compare-row">
              <span className="compare-label">Нормативная СПП</span>
              <div className="compare-values">
                <span className="compare-your">{fmt(cityCalc.normSpp)}</span>
                <span className="compare-norm">м²</span>
              </div>
            </div>

            <div className="compare-row">
              <span className="compare-label">Фактическая СПП</span>
              <div className="compare-values">
                <span className="compare-your">{fmt(inputs.sppTotal)}</span>
                <span className="compare-norm">м²</span>
                <span className={`compare-delta ${inputs.sppTotal > cityCalc.normSpp ? 'over' : 'ok'}`}>
                  {inputs.sppTotal > cityCalc.normSpp ? '+' : ''}{fmt(inputs.sppTotal - cityCalc.normSpp)} м²
                </span>
              </div>
            </div>
          </div>

          <div className="block">
            <div className="block-title">График плотности застройки</div>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
              Зависимость нормативной КПЗ от площади участка (городская функция)
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10, 12].map(a => ({
                  га: a,
                  норма: +cityDensity(a).toFixed(1),
                  проект: a === inputs.siteArea ? +calc.kpz.toFixed(2) : undefined,
                }))}
                margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="га" tickFormatter={v => v + ' га'} tick={{ fontSize: 10, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid #e0e0e0', borderRadius: 0 }} cursor={{ fill: '#f0f0f0' }} />
                <Bar dataKey="норма" fill="#ccc" radius={[2, 2, 0, 0]} />
                <Bar dataKey="проект" fill="#c41a00" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Map modal */}
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
