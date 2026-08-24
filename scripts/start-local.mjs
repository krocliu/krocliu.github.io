import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

const root = path.resolve('dist')
const port = 5173
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' }

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('未找到 dist/index.html。请先执行 npm run build。')
  process.exit(1)
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
  let file = path.resolve(root, `.${pathname}`)
  if (!file.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
  const extension = path.extname(file).toLowerCase()
  response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`茶叶排行榜已启动：http://localhost:${port}/`)
  execFile('cmd.exe', ['/c', 'start', '', `http://localhost:${port}/`])
})

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log(`已检测到运行中的看板服务，正在打开 http://localhost:${port}/`)
    execFile('cmd.exe', ['/c', 'start', '', `http://localhost:${port}/`])
    return
  }
  console.error(`启动失败：${error.message}`)
  process.exitCode = 1
})
