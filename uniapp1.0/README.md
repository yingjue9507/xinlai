# 人情薄（心来）UniApp 项目

人情礼金/礼簿管理应用，用于记录与管理人情往来、礼金收支。已从原有 Capacitor + Web 架构迁移至 **UniApp**，支持多端运行与打包。

---

## 目录结构

| 目录 | 说明 |
|------|------|
| **backend/** | Node.js (Express + TypeScript) 后端服务，REST API、JWT 认证、Prisma ORM |
| **renqinglai/** | UniApp 前端源码（Vue 3），使用 HBuilderX 开发与运行 |
| **legacy_ui/** | 旧版 HTML/JS 界面与需求文档，仅供参考 |

---

## 技术栈

- **后端**：Express、TypeScript、Prisma、SQLite、JWT、express-validator、multer、xlsx 等
- **前端**：UniApp、Vue 3，支持 H5、Android、iOS、微信小程序等
- **数据库**：SQLite（可通过 Prisma 更换为其他数据库）

---

## 主要功能模块

- **账本**：多账本管理（创建、列表、详情）
- **记一笔**：礼金/礼品记录（收支类型、金额、联系人、日期）
- **联系人**：联系人列表与详情、收/送礼统计
- **数据导出**：导出为 Excel 等
- **OCR 识别**：礼金单拍照/图片识别
- **群发通知**：批量发送与发送记录
- **公告**：红事/白事等公告
- **设置**：用户与应用设置

---

## 开发指南

### 1. 后端

```bash
cd backend
npm install
npm run dev
```

- 默认端口：**3030**（可在 `backend/.env` 中设置 `PORT`）
- 健康检查：`GET http://localhost:3030/api/health`
- API 文档：见 `backend/API文档.md`
- 数据库：使用 Prisma，`npm run prisma:generate` / `prisma:migrate` / `prisma:studio`

### 2. 前端

- 使用 **HBuilderX** 打开 **renqinglai** 目录
- 运行到浏览器、模拟器或真机进行调试
- 接口地址在 `renqinglai/common/config.js` 中配置 `baseUrl`：
  - 本地浏览器 / iOS 模拟器：`http://localhost:3030/api`（端口需与后端一致）
  - Android 模拟器：`http://10.0.2.2:3030/api`
  - 真机调试：本机局域网 IP，如 `http://192.168.x.x:3030/api`

### 3. 端口一致说明

后端当前默认监听 **3030**，前端 `config.js` 必须使用同一端口，否则接口无法连通。

---

## 前端页面结构（renqinglai）

- **TabBar**：首页、账本、联系人、设置
- **页面**：启动页、登录、首页、账本列表/创建/详情、记一笔、联系人列表/详情、设置、数据导出、OCR 识别、群发通知、发送记录等（见 `renqinglai/pages.json`）

---

## 迁移与构建说明

- 原有 `android/` 目录已废弃，由 UniApp 负责跨平台打包
- 旧版 HTML 页面逻辑需逐步迁移至对应 `.vue` 页面
- 打包产物：HBuilderX 运行/发行后生成在 `renqinglai/unpackage/` 下（含 APK 等）
