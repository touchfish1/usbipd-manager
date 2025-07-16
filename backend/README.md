# backend

本目录为 USBIPD Manager 的 Go 后端服务，基于 Gin 框架，负责 USB 设备管理、API 提供、日志持久化等。

## 主要功能
- 提供 RESTful API（/api/devices、/api/logs 等）
- 调用 usbipd-go/usbipd-win 实现设备映射、解绑
- 操作日志持久化（SQLite）

## 依赖
- Go 1.18+
- Gin
- modernc.org/sqlite

## 启动方式
```bash
cd backend
# 需先安装 usbipd-win 或 usbipd-go
# Windows 下需管理员权限
# 启动服务
 go run main.go
# 或编译
 go build -o usbipd-backend.exe main.go
```

## 主要 API
- GET    /api/devices      获取设备列表
- POST   /api/devices/:id/map    设备映射
- POST   /api/devices/:id/unmap  设备解绑
- GET    /api/logs         查询操作日志

## 日志说明
- 日志持久化到 operation_logs.db
- 结构包含时间戳、设备ID、操作类型、结果、错误信息等

---
如需扩展 API 或日志结构，请参考 main.go 注释。 