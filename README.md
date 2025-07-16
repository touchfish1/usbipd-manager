# USBIPD Manager

基于 usbipd-go（usbipd-win）+ Go + React + Vite + MUI + Electron 的 USB 设备映射管理软件。

## 项目简介

USBIPD Manager 是一款跨平台 USB 设备映射与管理工具，支持 Windows 下 USB 设备的远程映射、绑定、解绑、日志持久化等功能，前后端一体化打包，界面美观，易于扩展。

## 功能特性
- USB 设备列表实时展示，状态彩色标签
- 设备一键映射/解绑，支持 BUSID、VID:PID 等详细信息
- 操作日志持久化（SQLite），支持导出 CSV
- 前端基于 React + Vite + MUI，UI 现代美观
- 后端基于 Go + Gin，调用 usbipd-go/usbipd-win
- Electron 一体化打包，开箱即用
- 自动隐藏所有命令行黑框，体验无缝

## 目录结构
```
usb1/
├── backend/    # Go 后端，RESTful API，调用 usbipd-go
├── frontend/   # React + Vite + MUI 前端页面
├── electron/   # Electron 主进程，打包集成前后端
├── .gitignore  # 忽略依赖、构建产物、数据库等
└── README.md   # 项目说明文档
```

## 快速开始

### 1. 安装依赖
```bash
cd frontend && npm install
cd ../electron && npm install
```

### 2. 开发调试
- 后端：
  ```bash
  cd backend
  go run main.go
  # 默认监听 8080 端口
  ```
- 前端：
  ```bash
  cd frontend
  npm run dev
  # 访问 http://localhost:5173
  ```
- Electron：
  ```bash
  cd electron
  npm run dev
  # 自动加载前端页面
  ```

### 3. 一体化打包
```bash
cd frontend && npm run build
cd ../backend && go build -o usbipd-backend.exe main.go
cd ../electron && npm run dist
```
- 产物在 `electron/dist/win-unpacked/` 目录下，双击主程序 exe 即可运行。

## 常见问题
- **cmd 黑框弹窗**：已彻底隐藏，无需担心。
- **前端白屏/资源 404**：vite.config.ts 设置 base: './'。
- **大文件无法推送 GitHub**：已清理历史，.gitignore 已优化。
- **Electron 嵌套仓库**：已去除，主仓库统一管理。

## 进阶扩展
- 支持自定义图标、自动更新、托盘、更多日志筛选等。
- 欢迎二次开发与贡献！

---

如有问题请提 Issue 或联系作者。 