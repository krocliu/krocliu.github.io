# GitHub Pages 发布说明

本项目已经配置 GitHub Pages 自动发布。网页会公开展示导入后的榜单数据及商品图片/链接；请确认这些数据允许公开后再发布。

## 首次发布

1. 登录 GitHub，点击右上角“+” → “New repository”。
2. 仓库名称建议填写 `taobao-tea-ranking-dashboard`，选择 **Public**，不要勾选 README、`.gitignore` 或 License 初始化选项。
3. 在本机打开本项目目录的 PowerShell，按 GitHub 新仓库页面显示的“push an existing repository”命令依次执行。常用命令如下（将 `<你的用户名>` 和 `<仓库名>` 替换为实际内容）：

```powershell
git init
git add .
git commit -m "发布淘宝茶叶市场排行榜"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

4. 打开该仓库的 **Settings → Pages**，在 “Build and deployment” 的 “Source” 中选择 **GitHub Actions**。
5. 打开仓库的 **Actions**，等待名为 “Deploy dashboard to GitHub Pages” 的任务完成。
6. 任务完成后，网页地址通常是：

```text
https://<你的用户名>.github.io/<仓库名>/
```

将该地址复制到微信发送给好友即可。首次发布通常需要几分钟。

## 后续更新数据

1. 将新月份的源文件放入对应目录后，在本机执行：

```powershell
npm run process-data
git add public/data/rankings.json
git commit -m "更新月度榜单数据"
git push
```

2. GitHub 会自动重新构建并更新网页。

## 注意事项

- `data/source/` 中的原始 CSV/Excel 已被 `.gitignore` 排除，不会上传到 GitHub；仅生成后的网页数据会公开。
- GitHub Pages 是公开网页，任何获得链接的人都可以查看导入后的榜单内容。
- 若淘宝图片服务限制外链，个别商品主图可能无法在 GitHub Pages 显示；商品标题、链接和数据不受影响。
