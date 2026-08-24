import fs from 'node:fs/promises'
import path from 'node:path'

const names = ['西湖龙井明前特级', '武夷山大红袍礼盒', '云南普洱熟茶饼', '安溪铁观音浓香型', '福鼎白茶寿眉', '洞庭碧螺春春茶', '正山小种红茶', '凤凰单丛鸭屎香', '茉莉花茶特级', '六安瓜片绿茶']
const stores = ['茶山集旗舰店', '山野茶铺', '一叶知秋茶业', '云雾茶仓', '茶香里官方店', '东方茶事']
const months = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2025, 8 + index, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})

const result = {
  generatedAt: new Date().toISOString(),
  dataScopeNotice: '演示数据：仅用于界面预览。正式分析请导入已提供的月度商品排行数据。',
  months: months.map((month, monthIndex) => {
    const records = Array.from({ length: 300 }, (_, index) => {
      const productIndex = index + 1
      const swing = ((productIndex * 17 + monthIndex * 13) % 61) - 30
      const salesVolume = Math.max(110, 6800 - productIndex * 54 + swing * 18 + monthIndex * 35)
      const price = 39 + (productIndex % 12) * 22 + (monthIndex % 3) * 4
      return {
        productId: `tea-${String(productIndex).padStart(3, '0')}`,
        productUrl: `https://item.taobao.com/item.htm?id=demo${productIndex}`,
        productName: `${names[productIndex % names.length]} ${productIndex}号`,
        storeName: stores[productIndex % stores.length],
        price: Number(price.toFixed(2)),
        salesVolume,
        salesAmount: Number((salesVolume * price).toFixed(2)),
      }
    }).sort((a, b) => b.salesVolume - a.salesVolume || b.salesAmount - a.salesAmount || a.productId.localeCompare(b.productId))
      .map((record, index) => ({ ...record, rank: index + 1 }))
    return { month, records }
  }),
}

await fs.mkdir(path.resolve('public/data'), { recursive: true })
await fs.writeFile(path.resolve('public/data/rankings.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log('已生成 public/data/rankings.json（12 个月 × 300 条演示数据）')
