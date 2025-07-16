# electron

本目录为 USBIPD Manager 的 Electron 主进程，负责集成前后端、打包发布桌面应用。

## 主要功能
- 启动 Go 后端进程（usbipd-backend.exe）
- 加载前端页面（app/frontend/dist/index.html）
- 路径自动适配开发/生产环境
- 打包为 Windows 桌面应用

## 开发命令
```bash
npm install
npm run dev
```

## 打包命令
```bash
npm run dist
# 产物在 dist/win-unpacked/
```

## 路径适配
- 后端 exe 路径：process.resourcesPath + 'usbipd-backend.exe'
- 前端页面路径：process.resourcesPath + 'app/frontend/dist/index.html'

## 常见问题
- 权限不足：需用管理员权限运行
- 资源未拷贝：检查 extraResources 配置
- 黑框弹窗：已彻底隐藏

---
如需扩展 Electron 功能，请参考 main.js。 