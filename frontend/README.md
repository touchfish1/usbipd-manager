# frontend

本目录为 USBIPD Manager 的前端项目，基于 React + Vite + MUI，提供现代美观的 USB 设备管理界面。

## 技术栈
- React 18
- Vite 4+
- TypeScript
- MUI 5

## 主要页面
- 设备列表页（首页）
- 设备详情弹窗
- 日志弹窗（表格、导出 CSV）

## 开发命令
```bash
npm install
npm run dev
# 访问 http://localhost:5173
```

## 打包命令
```bash
npm run build
# 产物在 dist/
```

## 依赖说明
- @mui/material
- @mui/icons-material
- axios
- 其它见 package.json

## 注意事项
- Vite 配置 base: './'，确保 Electron 打包后资源路径正确
- 所有接口通过 http://localhost:8080/api 访问后端

---
如需自定义主题、扩展页面，请参考 src/ 目录。
