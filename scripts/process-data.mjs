import fs from 'node:fs/promises'
import path from 'node:path'
import XLSX from 'xlsx'

const SOURCE_DIR = path.resolve('data/source')
const CATEGORY_SOURCES = [
  { id: 'tea', label: '茶叶', directory: SOURCE_DIR },
  { id: 'packaging', label: '茶叶包装', directory: path.resolve('data/source/packaging') },
  { id: 'containers', label: '茶叶罐及礼盒', directory: path.resolve('data/source/containers') },
]
const OUTPUT_FILE = path.resolve('public/data/rankings.json')
const REPORT_FILE = path.resolve('data/import-report.json')
const aliases = {
  month: ['月份', '统计月份', '月度', 'month', 'date', '日期'],
  rank: ['排名', 'rank'],
  productId: ['商品id', '商品编号', '宝贝id', 'itemid', 'productid'],
  productUrl: ['商品链接', '商品url', '宝贝链接', '商品地址url', '链接', 'url', 'itemurl'],
  storeUrl: ['店铺链接', '店铺url', '店铺地址url', 'shopurl', 'storeurl'],
  imageUrl: ['商品图片url', '商品主图', '商品图片', 'imageurl', 'image'],
  productName: ['商品名称', '商品', '宝贝名称', '宝贝', '商品标题', '标题', 'productname', 'name'],
  storeName: ['店铺名称', '店铺', '卖家', '商家', '店铺名', 'storename', 'shopname'],
  price: ['价格', '商品价格', '售价', '均价', 'price'],
  salesVolume: ['销量', '月销量', '成交量', '销售件数', '成交件数', 'salesvolume', 'volume'],
  salesAmount: ['销售额', '成交额', 'gmv', '销售金额', '成交金额', 'salesamount', 'amount'],
  visitors: ['访客数', '访客', '访问人数', 'uv', 'visitors'],
}

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_\-（）()]/g, '')
}
function resolveColumns(headers) {
  const normalized = headers.map(normalizeHeader)
  return Object.fromEntries(Object.entries(aliases).map(([field, choices]) => [
    field,
    normalized.findIndex(header => choices.map(normalizeHeader).includes(header)),
  ]))
}
function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value ?? '').trim().replace(/[￥¥,\s]/g, '')
  if (!text) return Number.NaN
  const match = text.match(/^(-?[\d.]+)(万|千)?$/)
  if (!match) return Number.NaN
  const factor = match[2] === '万' ? 10000 : match[2] === '千' ? 1000 : 1
  const number = Number(match[1]) * factor
  return Number.isFinite(number) ? number : Number.NaN
}
function parseEstimate(value) {
  if (typeof value === 'number') return value
  const text = String(value ?? '').trim().replace(/,/g, '')
  const values = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|千)?/g)].map(match => Number(match[1]) * (match[2] === '万' ? 10000 : match[2] === '千' ? 1000 : 1))
  if (!values.length) return Number.NaN
  return values.reduce((sum, number) => sum + number, 0) / values.length
}
function normalizeMonth(value, fallback) {
  const text = String(value ?? '').trim() || String(fallback ?? '').trim()
  const match = text.match(/(20\d{2})[年/._-]?(1[0-2]|0?[1-9])/) 
  return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}` : null
}

// 淘宝导出的图片列有时会附带“_36x36.jpg”这类 CDN 缩略图后缀。
// 看板卡片需要较清晰的主图，因此去除尺寸后缀，仍使用同一商品的原图地址。
function normalizeImageUrl(value) {
  const url = String(value ?? '').trim()
  return url.replace(/_\d+x\d+\.(?:jpg|jpeg|png|webp)(?=(?:\?|$))/i, '')
}
function monthFromFilename(file) {
  return normalizeMonth(file, '')
}
async function toRows(filePath) {
  const workbook = /\.csv$/i.test(filePath)
    ? XLSX.read(await fs.readFile(filePath, 'utf8'), { type: 'string', raw: true })
    : XLSX.readFile(filePath, { cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
}

const report = { generatedAt: new Date().toISOString(), files: [], errors: [], warnings: [] }
let records = []
for (const category of CATEGORY_SOURCES) {
  let files = []
  try { files = (await fs.readdir(category.directory)).filter(file => /\.(csv|xlsx|xls)$/i.test(file)) } catch { report.errors.push(`找不到类目数据目录：${category.directory}`) }
  if (!files.length) continue
  for (const file of files) {
  const filePath = path.join(category.directory, file)
  try {
    const rows = await toRows(filePath)
    const [headers, ...body] = rows
    if (!headers?.length) throw new Error('文件为空或缺少表头。')
    const columns = resolveColumns(headers)
    const required = ['productName', 'storeName']
    const missing = required.filter(field => columns[field] < 0)
    if (columns.salesVolume < 0) {
      const paidBuyerIndex = headers.map(normalizeHeader).findIndex(header => ['支付买家数', '支付人数', '付款买家数'].map(normalizeHeader).includes(header))
      if (paidBuyerIndex >= 0) columns.salesVolume = paidBuyerIndex
      else missing.push('salesVolume/支付买家数')
    }
    if (missing.length) throw new Error(`缺少必要字段：${missing.join('、')}`)
    const fallbackMonth = monthFromFilename(file)
    if (columns.month < 0 && !fallbackMonth) throw new Error('缺少月份字段，且无法从文件名识别 YYYY-MM。')
    let accepted = 0
    body.forEach((row, rowOffset) => {
      if (!row.some(value => String(value).trim())) return
      const rowNumber = rowOffset + 2
      const month = normalizeMonth(columns.month < 0 ? '' : row[columns.month], fallbackMonth)
      const productUrl = columns.productUrl < 0 ? '' : String(row[columns.productUrl] ?? '').trim()
      const storeUrl = columns.storeUrl < 0 ? '' : String(row[columns.storeUrl] ?? '').trim()
      const imageUrl = columns.imageUrl < 0 ? '' : normalizeImageUrl(row[columns.imageUrl])
      const rawProductId = columns.productId < 0 ? '' : String(row[columns.productId] ?? '').trim()
      const productName = String(row[columns.productName] ?? '').trim()
      const storeName = String(row[columns.storeName] ?? '').trim()
      const price = columns.price < 0 ? null : parseNumber(row[columns.price])
      const salesVolume = parseEstimate(row[columns.salesVolume])
      const salesAmount = columns.salesAmount < 0 ? null : parseNumber(row[columns.salesAmount])
      const visitors = columns.visitors < 0 ? null : parseEstimate(row[columns.visitors])
      const productId = rawProductId || `${imageUrl.split('?')[0] || 'no-image'}::${storeName}::${productName}`
      if (!month || !productId || !productName || !storeName || !Number.isFinite(salesVolume) || salesVolume < 0 || (price !== null && (!Number.isFinite(price) || price < 0)) || (salesAmount !== null && (!Number.isFinite(salesAmount) || salesAmount < 0))) {
        report.errors.push(`${file} 第 ${rowNumber} 行：月份、商品名、店铺及销量/支付买家数须有效；存在的价格或销售额也须为有效数值。`)
        return
      }
      records.push({ categoryId: category.id, month, productId, productUrl, storeUrl, imageUrl, productName, storeName, price, salesVolume, salesVolumeLabel: String(row[columns.salesVolume]).trim(), salesAmount, visitors, visitorsLabel: columns.visitors < 0 ? '' : String(row[columns.visitors]).trim(), sourceRankChange: columns.rank < 0 ? '' : String(row[columns.rank]).trim(), sourceOrder: rowOffset, sourceFile: file })
      accepted += 1
    })
    report.files.push({ category: category.label, file, rowsRead: body.length, rowsAccepted: accepted, usedFilenameMonth: columns.month < 0 })
  } catch (error) { report.errors.push(`${file}：${error.message}`) }
}
}

const seen = new Map()
for (const record of records) {
  const key = `${record.categoryId}::${record.month}::${record.productId}`
  if (seen.has(key)) report.warnings.push(`检测到重复商品：${record.month} 的“${record.productName}”（按源表名次保留展示）。`)
  else seen.set(key, record.sourceFile)
}
const monthSet = [...new Set(records.map(record => record.month))].sort()
if (monthSet.length && monthSet.length < 12) report.warnings.push(`当前识别到 ${monthSet.length} 个月份；建议至少导入连续 12 个月数据。`)
if (report.errors.length) {
  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true })
  await fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`)
  console.error(`导入失败：发现 ${report.errors.length} 个错误。详见 ${REPORT_FILE}`)
  process.exit(1)
}

function buildMonths(categoryId) {
  const categoryRecords = records.filter(record => record.categoryId === categoryId)
  const months = [...new Set(categoryRecords.map(record => record.month))].sort()
  return months.map(month => ({
    month,
    records: categoryRecords.filter(record => record.month === month)
      .sort((a, b) => a.sourceOrder - b.sourceOrder)
      .slice(0, 300)
      .map((record, index) => ({ ...record, rank: index + 1 })),
  }))
}
const categories = CATEGORY_SOURCES.map(category => ({ id: category.id, label: category.label, months: buildMonths(category.id) })).filter(category => category.months.length)
const output = {
  generatedAt: new Date().toISOString(),
  dataScopeNotice: '统计范围仅为已导入的月度商品排行数据，不代表淘宝茶叶全市场交易数据。支付买家数和访客数为平台提供的区间，本看板以区间中位值仅作趋势估算。',
  metricAvailability: { price: records.some(record => record.price !== null), salesAmount: records.some(record => record.salesAmount !== null), visitors: records.some(record => record.visitors !== null), salesVolumeEstimated: true },
  categories,
  months: categories.find(category => category.id === 'tea')?.months ?? [],
}
await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`)
await fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`)
console.log(`导入完成：${categories.map(category => `${category.label} ${category.months.length} 个月、${category.months.reduce((sum, month) => sum + month.records.length, 0)} 条`).join('；')}。`)
