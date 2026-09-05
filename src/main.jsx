import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as echarts from 'echarts'
import './styles.css'
import './product-grid.css'
import './insight-images.css'
import './category-sales.css'
import './detail-links.css'
import './pagination.css'

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 })
const integer = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })
const RECENT_YEAR = 'recent-year'
const RANKING_LIMIT = 300
const PAGE_SIZE = 100
const teaCategoryRules = [
  ['普洱茶', ['普洱', '熟茶', '生茶']], ['绿茶', ['龙井', '碧螺春', '毛尖', '瓜片', '绿茶', '安吉白茶']],
  ['红茶', ['红茶', '金骏眉', '正山小种', '滇红', '祁门']], ['乌龙茶', ['乌龙', '铁观音', '大红袍', '岩茶', '单丛', '水仙']],
  ['白茶', ['白茶', '寿眉', '银针', '牡丹']], ['花果茶', ['茉莉', '花茶', '花果茶', '果茶', '代用茶']],
]
const packagingCategoryRules = [
  ['茶叶包装袋', ['包装袋', '密封袋', '自封袋', '铝箔袋', '小泡袋', '泡袋', '内袋', '牛皮纸袋']],
  ['茶叶包装盒', ['包装盒', '纸盒', '空盒', '盒子', '天地盖', '翻盖', '抽屉盒']],
  ['茶叶罐/铁盒', ['茶叶罐', '铁盒', '金属罐', '马口铁']],
  ['礼盒/套装', ['礼盒', '套装', '双罐', '多罐']],
  ['标签/配件', ['标签', '封口贴', '贴纸', '麻绳', '手提袋']],
]
const containerCategoryRules = [
  ['玻璃茶叶罐', ['玻璃', '玻璃瓶', '透明罐']],
  ['陶瓷茶叶罐', ['陶瓷', '瓷罐', '紫砂']],
  ['金属茶叶罐', ['铁罐', '金属罐', '铝罐', '马口铁', '锡罐']],
  ['木质/竹制茶叶罐', ['木盒', '木质', '竹盒', '竹制']],
  ['礼盒/套装', ['礼盒', '套装', '双罐', '多罐']],
]
function classifyByTitle(name, rules, fallback) { return rules.find(([, keywords]) => keywords.some(keyword => name.includes(keyword)))?.[0] ?? fallback }
function productSubcategory(categoryId, name, sourceCategory) {
  if (categoryId === 'tea') return classifyByTitle(name, teaCategoryRules, '其他茶类')
  if (categoryId === 'packaging') return classifyByTitle(name, packagingCategoryRules, '其他包装')
  if (categoryId === 'containers') return classifyByTitle(name, containerCategoryRules, '其他茶叶罐')
  return sourceCategory || '其他'
}
function summarizeDimension(records, getLabel) {
  const groups = new Map()
  records.forEach(record => {
    const label = getLabel(record)
    const current = groups.get(label) ?? { label, volume: 0, products: 0 }
    current.volume += record.salesVolume
    current.products += 1
    groups.set(label, current)
  })
  return [...groups.values()].sort((a, b) => b.volume - a.volume)
}
function recentYearRanking(months) {
  const products = new Map()
  months.forEach(month => month.records.forEach(record => {
    const current = products.get(record.productId)
    if (!current) products.set(record.productId, { ...record, salesVolume: 0, visitors: 0, salesAmount: 0, salesVolumeLabel: '', visitorsLabel: '', sourceRankChange: '', aggregatePeriod: true })
    const total = products.get(record.productId)
    if (current) {
      const totals = { salesVolume: total.salesVolume, visitors: total.visitors, salesAmount: total.salesAmount }
      Object.assign(total, record, totals, { salesVolumeLabel: '', visitorsLabel: '', sourceRankChange: '', aggregatePeriod: true })
    }
    total.salesVolume += record.salesVolume
    total.visitors += record.visitors ?? 0
    total.salesAmount += record.salesAmount ?? 0
  }))
  return [...products.values()].sort((a, b) => b.salesVolume - a.salesVolume || b.visitors - a.visitors).slice(0, RANKING_LIMIT).map((record, index) => ({ ...record, rank: index + 1 }))
}

function demoData() {
  const teaNames = ['西湖龙井明前特级', '武夷山大红袍礼盒', '云南普洱熟茶饼', '安溪铁观音浓香型', '福鼎白茶寿眉', '洞庭碧螺春春茶', '正山小种红茶', '凤凰单丛鸭屎香', '茉莉花茶特级', '六安瓜片绿茶']
  const shops = ['茶山集旗舰店', '山野茶铺', '一叶知秋茶业', '云雾茶仓', '茶香里官方店', '东方茶事']
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(2025, 8 + monthIndex, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const records = Array.from({ length: RANKING_LIMIT }, (_, index) => {
      const number = index + 1
      const swing = ((number * 17 + monthIndex * 13) % 61) - 30
      const salesVolume = Math.max(110, 6800 - number * 54 + swing * 18 + monthIndex * 35)
      const price = 39 + (number % 12) * 22 + (monthIndex % 3) * 4
      return { productId: `tea-${String(number).padStart(3, '0')}`, productUrl: '', productName: `${teaNames[number % teaNames.length]} ${number}号`, storeName: shops[number % shops.length], price, salesVolume, salesAmount: salesVolume * price }
    }).sort((a, b) => b.salesVolume - a.salesVolume || b.salesAmount - a.salesAmount || a.productId.localeCompare(b.productId)).map((record, rank) => ({ ...record, rank: rank + 1 }))
    return { month, records }
  })
  return { generatedAt: null, demo: true, dataScopeNotice: '演示数据：仅用于界面预览。正式分析请导入已提供的月度商品排行数据。', months }
}

function Chart({ option, className = '' }) {
  const element = useRef(null)
  useEffect(() => {
    const instance = echarts.init(element.current, undefined, { renderer: 'canvas' })
    instance.setOption(option)
    const resize = () => instance.resize()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); instance.dispose() }
  }, [option])
  return <div ref={element} className={`chart ${className}`} role="img" aria-label="数据图表" />
}

function rankChange(current, previous) {
  if (current.aggregatePeriod) return { label: '近一年累计', tone: 'neutral' }
  if (current.sourceRankChange) {
    const label = current.sourceRankChange
    return { label, tone: label.includes('升') ? 'up' : label.includes('降') ? 'down' : 'neutral' }
  }
  if (!previous) return { label: '新上榜', tone: 'neutral' }
  const delta = previous.rank - current.rank
  if (delta > 0) return { label: `↑ ${delta}`, tone: 'up' }
  if (delta < 0) return { label: `↓ ${Math.abs(delta)}`, tone: 'down' }
  return { label: '—', tone: 'neutral' }
}

function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [categoryId, setCategoryId] = useState('tea')
  const [month, setMonth] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rank')
  const [direction, setDirection] = useState('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('./data/rankings.json').then(response => {
      if (!response.ok) throw new Error('数据文件无法读取')
      return response.json()
    }).then(result => {
      const finalData = (result.categories?.length || result.months?.length) ? result : demoData()
      setData(finalData)
      const firstMonths = finalData.categories?.[0]?.months ?? finalData.months ?? []
      setCategoryId(finalData.categories?.[0]?.id ?? 'tea')
      setMonth(firstMonths.at(-1)?.month ?? '')
    }).catch(error => {
      setLoadError(error.message)
      const fallback = demoData()
      setData(fallback)
      setMonth(fallback.months.at(-1).month)
    })
  }, [])

  const categories = useMemo(() => {
    if (data?.categories?.length) return data.categories
    return data ? [{ id: 'tea', label: '茶叶', months: data.months ?? [] }] : []
  }, [data])
  const activeCategory = categories.find(item => item.id === categoryId) ?? categories[0]
  const categoryMonths = activeCategory?.months ?? []
  useEffect(() => {
    if (categoryMonths.length && !categoryMonths.some(item => item.month === month)) setMonth(categoryMonths.at(-1).month)
  }, [categoryId, categoryMonths, month])

  const isRecentYear = month === RECENT_YEAR
  const monthIndex = useMemo(() => categoryMonths.findIndex(item => item.month === month), [categoryMonths, month])
  const recentYear = useMemo(() => categoryMonths.length ? { month: '最近一年', records: recentYearRanking(categoryMonths.slice(-12)) } : null, [categoryMonths])
  const activeMonth = isRecentYear ? recentYear : categoryMonths[monthIndex]
  const previousMonth = isRecentYear ? undefined : categoryMonths[monthIndex - 1]
  const previousById = useMemo(() => new Map(previousMonth?.records.map(record => [record.productId, record])), [previousMonth])
  const filteredRecords = useMemo(() => {
    if (!activeMonth) return []
    const key = query.trim().toLowerCase()
    return activeMonth.records.filter(record => !key || [record.productName, record.storeName, record.productId].some(value => String(value).toLowerCase().includes(key)))
      .sort((a, b) => {
        const multiplier = direction === 'asc' ? 1 : -1
        if (sort === 'rank') return multiplier * (a.rank - b.rank)
        return multiplier * (a[sort] - b[sort])
      })
  }, [activeMonth, query, sort, direction])
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => setPage(1), [categoryId, month, query, sort, direction])
  const monthlySummary = useMemo(() => categoryMonths.map(item => ({
    month: item.month,
    salesVolume: item.records.reduce((sum, record) => sum + record.salesVolume, 0),
    salesAmount: item.records.reduce((sum, record) => sum + record.salesAmount, 0),
  })), [categoryMonths])
  const productHistory = useMemo(() => {
    if (!selected) return []
    return categoryMonths.map(item => item.records.find(record => record.productId === selected.productId)).filter(Boolean)
  }, [selected, categoryMonths])
  const subcategorySales = useMemo(() => summarizeDimension(activeMonth?.records ?? [], record => productSubcategory(activeCategory?.id, record.productName, record.sourceCategory)), [activeMonth, activeCategory])
  const storeSales = useMemo(() => summarizeDimension(activeMonth?.records ?? [], record => record.storeName).slice(0, 6), [activeMonth])
  const crossMonth = useMemo(() => {
    if (!categoryMonths.length) return { stable: [], up: [], down: [] }
    const histories = new Map()
    categoryMonths.forEach(item => item.records.forEach(record => {
      const list = histories.get(record.productId) ?? []
      list.push({ ...record, month: item.month })
      histories.set(record.productId, list)
    }))
    const entries = [...histories.values()]
    const changes = entries.filter(list => list.length >= 2).map(list => ({ record: list.at(-1), change: list.at(-2).rank - list.at(-1).rank }))
    return {
      stable: entries.filter(list => list.length === categoryMonths.length).sort((a, b) => b.at(-1).salesVolume - a.at(-1).salesVolume).slice(0, 10).map(list => list.at(-1)),
      up: changes.filter(item => item.change > 0).sort((a, b) => b.change - a.change).slice(0, 10),
      down: changes.filter(item => item.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
    }
  }, [categoryMonths])

  if (!data) return <main className="loading">正在加载月度茶叶市场数据…</main>
  const hasSalesAmount = data.metricAvailability?.salesAmount !== false
  const hasPrice = data.metricAvailability?.price !== false
  const hasVisitors = data.metricAvailability?.visitors === true
  const isEstimatedVolume = data.metricAvailability?.salesVolumeEstimated === true
  const volumeTitle = isEstimatedVolume ? '支付买家数估算' : '样本总销量'
  const totalVolume = activeMonth?.records.reduce((sum, record) => sum + record.salesVolume, 0) ?? 0
  const totalAmount = activeMonth?.records.reduce((sum, record) => sum + record.salesAmount, 0) ?? 0
  const totalVisitors = activeMonth?.records.reduce((sum, record) => sum + (record.visitors ?? 0), 0) ?? 0
  const leader = activeMonth?.records[0]
  const volumeChart = {
    grid: { left: 56, right: 24, top: 22, bottom: 42 },
    tooltip: { trigger: 'axis', valueFormatter: value => integer.format(value) },
    xAxis: { type: 'category', data: monthlySummary.map(item => item.month.slice(5) + '月'), axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e8efec' } }, axisLabel: { formatter: value => compact.format(value) } },
    series: [{ data: monthlySummary.map(item => item.salesVolume), type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 3, color: '#23634f' }, itemStyle: { color: '#d49437' }, areaStyle: { color: 'rgba(35,99,79,.12)' } }],
  }
  const secondaryChart = {
    grid: { left: 64, right: 24, top: 22, bottom: 42 },
    tooltip: { trigger: 'axis', valueFormatter: value => hasSalesAmount ? currency.format(value) : integer.format(value) },
    xAxis: { type: 'category', data: monthlySummary.map(item => item.month.slice(5) + '月'), axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e8efec' } }, axisLabel: { formatter: value => compact.format(value) } },
    series: [{ data: hasSalesAmount ? monthlySummary.map(item => item.salesAmount) : categoryMonths.map(item => item.records.reduce((sum, record) => sum + (record.visitors ?? 0), 0)), type: 'bar', barMaxWidth: 28, itemStyle: { color: '#d49437', borderRadius: [5, 5, 0, 0] } }],
  }

  return <main className="shell">
    <header className="topbar">
      <div><p className="eyebrow">TAOBAO TEA MARKET · MONTHLY INDEX</p><h1>淘宝茶叶市场月度排行榜</h1><p className="subtitle">{activeCategory?.label ?? '茶叶'} · 月度 Top 300 商品与跨月表现追踪</p></div>
      <div className="header-meta"><span className={data.demo ? 'badge demo' : 'badge'}>{data.demo ? '演示数据' : '正式数据'}</span><span>{data.generatedAt ? `更新于 ${new Date(data.generatedAt).toLocaleDateString('zh-CN')}` : '等待导入真实数据'}</span></div>
    </header>

    <section className="notice"><span>i</span><p>{data.dataScopeNotice}</p>{loadError && <small>读取提示：{loadError}</small>}</section>

    <section className="toolbar" aria-label="榜单筛选">
      <label>统计类目<select value={activeCategory?.id ?? ''} onChange={event => { setCategoryId(event.target.value); setSelected(null) }}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>统计月份<select value={month} onChange={event => setMonth(event.target.value)}><option value={RECENT_YEAR}>最近一年（{categoryMonths.slice(-12).at(0)?.month ?? '—'} 至 {categoryMonths.at(-1)?.month ?? '—'}）</option>{categoryMonths.map(item => <option key={item.month} value={item.month}>{item.month}</option>)}</select></label>
      <label className="search">搜索商品或店铺<input value={query} onChange={event => setQuery(event.target.value)} placeholder="输入商品名、店铺或商品 ID" /></label>
      <button type="button" className="outline" onClick={() => { setQuery(''); setSort('rank'); setDirection('asc') }}>重置筛选</button>
    </section>

    <section className="kpis">
      <article><span>{isRecentYear ? '近一年汇总商品' : '当月入榜商品'}</span><strong>{integer.format(activeMonth?.records.length ?? 0)}</strong><small>{isRecentYear ? '近 12 个月累计排名的 Top 300' : '按销量排名的 Top 300'}</small></article>
      <article><span>{volumeTitle}</span><strong>{compact.format(totalVolume)}</strong><small>{isEstimatedVolume ? '支付买家数区间中位估算' : '已导入榜单数据范围'}</small></article>
      <article><span>{hasSalesAmount ? '样本销售额' : '访客数估算'}</span><strong>{hasSalesAmount ? currency.format(totalAmount) : compact.format(totalVisitors)}</strong><small>{hasSalesAmount ? '已导入榜单数据范围' : '访客数区间中位估算'}</small></article>
      <article><span>榜首商品</span><strong className="leader">{leader?.productName ?? '—'}</strong><small>{leader ? `${integer.format(leader.salesVolume)} 件` : '—'}</small></article>
    </section>

    <section className="content-grid">
      <article className="panel ranking-panel"><div className="panel-head"><div><p className="eyebrow">MONTHLY TOP 300</p><h2>{month} 商品榜单</h2></div><div className="ranking-actions"><span>{filteredRecords.length} 条结果 · 第 {page}/{pageCount} 页</span><button className={sort === 'rank' ? 'active' : ''} onClick={() => { setSort('rank'); setDirection('asc') }}>按排名</button><button className={sort === 'salesVolume' ? 'active' : ''} onClick={() => { setSort('salesVolume'); setDirection('desc') }}>{isEstimatedVolume ? '支付买家数' : '销量'}</button><button className={sort === 'visitors' ? 'active' : ''} onClick={() => { setSort('visitors'); setDirection('desc') }}>访客数</button></div></div>
        <div className="product-grid">{pagedRecords.map(record => { const change = rankChange(record, previousById.get(record.productId)); return <button className="product-card" key={`${record.productId}-${record.rank}`} onClick={() => setSelected(record)}><span className={`card-rank ${record.rank <= 3 ? `top-${record.rank}` : ''}`}>#{record.rank}</span><ProductImage record={record} /><strong>{record.productName}</strong><small>{record.storeName}</small><div><span className={`change ${change.tone}`}>{change.label}</span><em>{record.salesVolumeLabel || integer.format(record.salesVolume)}</em></div></button> })}</div>
        {pageCount > 1 && <nav className="pagination" aria-label="榜单分页"><button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button className={page === number ? 'active' : ''} key={number} onClick={() => setPage(number)}>{number}</button>)}<button disabled={page === pageCount} onClick={() => setPage(page + 1)}>下一页</button></nav>}
      </article>
      <aside className="panel insight-panel"><div className="panel-head"><div><p className="eyebrow">CROSS-MONTH</p><h2>榜单动态</h2></div></div>
        <DimensionSales title="品类动态" note="按商品标题规则细分并按支付买家数估算汇总排名" items={subcategorySales} />
        <DimensionSales title="品牌/店铺热度" note="以店铺名称作为品牌维度" items={storeSales} />
        <RankList title="持续上榜商品" items={crossMonth.stable} description="12 个月均在 Top 300" onSelect={setSelected} />
        <RankList title="本月上升最快" items={crossMonth.up.map(item => ({ ...item.record, annotation: `↑ ${item.change} 位` }))} onSelect={setSelected} />
        <RankList title="本月下降最多" items={crossMonth.down.map(item => ({ ...item.record, annotation: `↓ ${Math.abs(item.change)} 位` }))} onSelect={setSelected} />
      </aside>
    </section>

    <section className="charts"><article className="panel"><div className="panel-head"><div><p className="eyebrow">TREND</p><h2>Top 100 样本{isEstimatedVolume ? '支付买家数估算' : '销量'}趋势</h2></div><span>{isEstimatedVolume ? '区间中位估算' : '单位：件'}</span></div><Chart option={volumeChart} /></article><article className="panel"><div className="panel-head"><div><p className="eyebrow">TREND</p><h2>Top 100 样本{hasSalesAmount ? '销售额' : '访客数估算'}趋势</h2></div><span>{hasSalesAmount ? '单位：元' : '区间中位估算'}</span></div><Chart option={secondaryChart} /></article></section>
    {selected && <DetailDrawer product={selected} history={productHistory} metricAvailability={data.metricAvailability} onClose={() => setSelected(null)} />}
  </main>
}

function RankList({ title, items, description, onSelect }) {
  return <section className="rank-list"><h3>{title}</h3>{description && <p>{description}</p>}<ol>{items.length ? items.map(item => <li key={item.productId} onClick={() => onSelect(item)}><ProductImage record={item} /><span className="insight-name">{item.productName}</span><em>{item.annotation ?? `第 ${item.rank} 名`}</em></li>) : <li className="empty">数据不足，暂无法计算</li>}</ol></section>
}

function DimensionSales({ title, note, items, emptyText }) {
  const maximum = items[0]?.volume ?? 1
  return <section className="dimension-sales"><h3>{title}</h3><p>{note}；支付买家数区间中位估算</p>{items.length ? items.map(item => <div className="dimension-row" key={item.label}><div><span title={item.label}>{item.label}</span><b>{compact.format(item.volume)}</b></div><i><em style={{ width: `${Math.max(5, item.volume / maximum * 100)}%` }} /></i><small>{item.products} 个商品</small></div>) : <small className="dimension-empty">{emptyText ?? '暂无可用数据'}</small>}</section>
}

function ExternalLink({ href, className, children, label }) {
  if (!href) return children
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} onClick={event => event.stopPropagation()}>{children}<sup>↗</sup></a>
}

function ProductImage({ record, large = false }) {
  const [failed, setFailed] = useState(false)
  if (!record.imageUrl || failed) return <span className={`image-placeholder ${large ? 'large' : ''}`}>茶</span>
  return <img className={`product-image ${large ? 'large' : ''}`} src={record.imageUrl} alt={`${record.productName} 主图`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
}

function DetailDrawer({ product, history, metricAvailability, onClose }) {
  const estimated = metricAvailability?.salesVolumeEstimated === true
  const hasVisitors = metricAvailability?.visitors === true
  const hasSalesAmount = metricAvailability?.salesAmount !== false
  const hasPrice = metricAvailability?.price !== false
  const metricName = estimated ? '支付买家数' : '本月销量'
  const volumeSeriesName = estimated ? '支付买家数估算' : '销量'
  const option = {
    grid: { left: 42, right: 20, top: 30, bottom: 35 }, tooltip: { trigger: 'axis' }, legend: { data: [volumeSeriesName, '排名'], top: 0 },
    xAxis: { type: 'category', data: history.map(item => item.month.slice(5) + '月') },
    yAxis: [{ type: 'value', name: '销量', splitLine: { lineStyle: { color: '#e8efec' } } }, { type: 'value', name: '排名', inverse: true, min: 1, max: 100 }],
    series: [{ name: volumeSeriesName, type: 'line', smooth: true, data: history.map(item => item.salesVolume), lineStyle: { color: '#23634f', width: 3 }, itemStyle: { color: '#23634f' } }, { name: '排名', type: 'line', yAxisIndex: 1, data: history.map(item => item.rank), lineStyle: { color: '#d49437', width: 2 }, itemStyle: { color: '#d49437' } }],
  }
  const title = <ExternalLink className="product-link" href={product.productUrl} label={`打开商品：${product.productName}`}>{product.productName}</ExternalLink>
  const store = <ExternalLink className="store-link" href={product.storeUrl} label={`打开店铺：${product.storeName}`}>{product.storeName}</ExternalLink>
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={event => event.stopPropagation()}><button className="close" onClick={onClose} aria-label="关闭">×</button><p className="eyebrow">PRODUCT DETAIL</p><ProductImage record={product} large /><h2>{title}</h2><p className="store">{store}</p><div className="product-kpis"><span>本月排名<strong>#{product.rank}</strong></span><span>{metricName}<strong>{product.salesVolumeLabel || integer.format(product.salesVolume)}</strong></span><span>{hasVisitors ? '访客数' : hasSalesAmount ? '销售额' : '名次变化'}<strong>{hasVisitors ? (product.visitorsLabel || '—') : hasSalesAmount ? currency.format(product.salesAmount) : (product.sourceRankChange || '—')}</strong></span><span>{hasPrice ? '价格' : '数据口径'}<strong>{hasPrice ? currency.format(product.price) : estimated ? '区间估算' : '—'}</strong></span></div>{product.productUrl && <a className="taobao-link" href={product.productUrl} target="_blank" rel="noreferrer">前往淘宝商品页 ↗</a>}<h3>近 12 个月表现</h3><Chart option={option} className="detail-chart" /><div className="history"><h3>上榜记录</h3>{history.slice().reverse().map(item => <div key={item.month}><span>{item.month}</span><b>#{item.rank}</b><span>{item.salesVolumeLabel || integer.format(item.salesVolume)}</span></div>)}</div></aside></div>
}

createRoot(document.getElementById('root')).render(<App />)
