<div align="center">

**[English](README.md)** | **[中文](README_CN.md)**

# amory

**一款私密的、全栈情侣关系追踪应用。**
作为个人热情项目从零打造 — 后端、前端、移动端壳、推送通知、部署流水线，全部自行实现。

[![status](https://img.shields.io/badge/status-live-success?style=flat-square)](https://amory-love.com)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](#)
[![fastapi](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![react](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](#)
[![postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#)
[![capacitor](https://img.shields.io/badge/Capacitor-iOS%20%26%20Android-119EFF?style=flat-square&logo=ionic&logoColor=white)](#)

</div>

---

## 项目简介

**amory** 是一款情侣关系伴侣应用 — 为情侣提供一个统一空间来记录共同生活：日记、每月照片集、约会计划、共读书籍、礼物与愿望清单、约会夜小游戏、推送提醒，以及基于 Ticketmaster 的活动推荐。它以 PWA 形式在 Web 端运行，并通过 Capacitor 打包为 iOS 和 Android 原生应用。

> 线上地址：[amory-love.com](https://amory-love.com)（私密，仅限受邀用户）。

这是一个**同时充当工程沙盒的个人项目** — 每一层都是从零构建的：认证、推送投递、文件上传、部署、移动端壳，全部自主完成。

## 架构

```
                   ┌──────────────────────────────────────┐
                   │  amory-love.com                      │
                   │  Caddy 2 (自动 HTTPS，Let's Encrypt) │
                   └──────────────┬───────────────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
                ▼                                    ▼
   ┌────────────────────────┐         ┌────────────────────────┐
   │  前端 (Vite)           │         │  后端 (FastAPI)        │
   │  React 18 + TypeScript │  ◄───►  │  Python 3.12 + JWT     │
   │  Capacitor (iOS/安卓)  │         │  Web Push (VAPID)      │
   │  Spotify 迷你播放器    │         │  Ticketmaster 轮询     │
   └────────────────────────┘         └──────────┬─────────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │  PostgreSQL 16   │
                                       │  (docker volume) │
                                       └──────────────────┘
```

所有服务以容器形式运行在 Hostinger VPS 上的单个 `docker compose` 栈中。Caddy 负责 TLS 终止和反向代理；后端不会直接暴露到公网。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| **后端** | FastAPI · SQLAlchemy · Pydantic · python-jose (JWT) · passlib (bcrypt) · pywebpush (VAPID) · uvicorn |
| **数据库** | PostgreSQL 16 (alpine) — 关系型表结构，包含用户、情侣、日记、月度内容、约会等 |
| **前端** | React 18 · TypeScript · Vite · Tailwind CSS · React Router · Service Worker 推送 |
| **移动端** | Capacitor — iOS (Xcode/SPM) 和 Android (Gradle) 原生壳 |
| **基础设施** | Docker Compose · Caddy 2 (自动 HTTPS) · Hostinger VPS (Ubuntu 24.04) |
| **外部 API** | Ticketmaster Discovery API（活动推荐）、Spotify Web API（正在播放组件） |
| **部署** | 自定义 `paramiko` 部署脚本 — 打包项目、SFTP 传输、远程构建、运行 `docker compose up -d` |

## 功能特性

### 核心功能
- **认证** — 邮箱 + 密码登录，JWT 令牌；密码重置流程。
- **情侣配对** — 邀请链接配对；双方看到相同的共享内容。
- **日记** — 长文日记，支持图片附件和心情标签。
- **月度相册** — 按月展示照片网格，附带备注和精选。
- **约会记录** — 计划、记录和回忆约会；地图预览；小票照片。
- **愿望清单** — 礼物、地点、惊喜；完成后伴侣可互动回应。
- **共读书单** — 共享阅读列表，带进度条和笔记。
- **活动推荐** — 按城市/类型搜索 Ticketmaster 活动，匹配时推送通知。
- **聊天** — 轻量级应用内消息（不是聊天替代品，仅用于上下文关联的笔记）。

### 约会夜附加功能
- **小游戏**：真心话大冒险、宾果、转盘、倒计时、爱情罐、秘密信件、谁最可能。
- **日历**、**预算**、**挑战**、**梦想板**、**歌单**（Spotify）、**食谱**、**时间线** — 全部在统一的"更多"中心中。

### 互动体验
- **Web 推送通知**（VAPID）— 每日回忆回放、伴侣互动、活动提醒。
- **游戏化** — 成就系统、连续打卡、爱情计数器组件。
- **彩蛋** — 隐藏的书籍线索、动画爱情计数器、粒子/手写效果。

## 本地开发

```bash
# 0. 为后端生成 SECRET_KEY
openssl rand -hex 32

# 1. 复制环境变量模板并填写
cp .env.example .env
# 最少需要填写：
#   DOMAIN=localhost
#   DB_PASSWORD=<本地用任意字符串>
#   SECRET_KEY=<第 0 步生成的密钥>
#   CORS_ORIGINS=http://localhost:5173

# 2. 启动完整服务栈
docker compose up -d --build

# 3. 查看日志
docker compose logs -f backend
```

前端由 Caddy 在 `http://localhost` 提供服务。开发时如需前端热重载，可单独运行：

```bash
cd frontend
npm install
npm run dev    # Vite 运行在 http://localhost:5173
```

## 项目结构

```
amory/
├── backend/
│   ├── app/
│   │   ├── auth/         # JWT + 依赖注入
│   │   ├── models/       # SQLAlchemy 模型
│   │   ├── schemas/      # Pydantic 数据模式
│   │   ├── routes/       # FastAPI 路由
│   │   ├── services/     # Ticketmaster 客户端、推送投递
│   │   ├── data/         # 静态种子数据（测验题目等）
│   │   ├── config.py     # 环境变量驱动的配置
│   │   └── main.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # 认证、特效、共享组件
│   │   ├── pages/        # 首页、小游戏、更多、活动
│   │   ├── context/      # AuthContext、SpotifyContext
│   │   └── services/api.ts
│   ├── android/          # Capacitor — Android 原生壳
│   ├── ios/              # Capacitor — iOS 原生壳
│   └── Dockerfile        # nginx 提供 Vite 构建产物
├── Caddyfile             # 反向代理 + 自动 TLS
├── docker-compose.yml
└── .env.example
```

## 安全说明

- `.env` 已被 gitignore。切勿提交真实密钥。
- `SECRET_KEY` 为启动必需 — 缺少时应用拒绝启动。
- VAPID 密钥仅存在于环境变量中；每次发布超出小范围时应更换。
- 文件上传存储在仓库之外（Docker volume `backend-uploads`）。
- 所有容器间流量走 Docker 内部网络；仅 Caddy 暴露 `:80/:443` 端口。

## 许可证

MIT — 详见 [LICENSE](LICENSE)。

---

<div align="center">

由 [Camilo Acevedo](https://camiloacevedo.dev) 构建 · [github.com/camilo-acevedo](https://github.com/camilo-acevedo)

</div>
