# Amory 服务器部署说明

## 环境要求

- Docker + Docker Compose
- 服务器 IP: `47.108.186.1`
- 阿里云 ECS (1.8GB RAM)

## 快速部署

```bash
cd /home/admin/amory
sudo docker compose up -d --build
```

## 服务架构

```
用户请求 (HTTP/HTTPS)
    ↓
Caddy (80/443)  ←  自签 HTTPS, HTTP→HTTPS 重定向
    ├── /amory/api/*  →  Backend (FastAPI:8000)
    ├── /uploads/*    →  Backend (FastAPI:8000)
    └── /amory/*      →  Frontend (nginx:80)
                          ├── 静态文件 (SPA)
                          └── /api/*  →  Backend (CORS 后备头)
                          └── /uploads/* → Backend
```

## 关键配置

### CORS (跨域资源共享)

Android APK 的 WebView origin 是 `capacitor://localhost`，需要后端和 nginx 都允许此 origin。

**后端 (FastAPI):**
- 配置文件: `backend/app/config.py`
- CORS_ORIGINS 环境变量: `backend/.env`
- 允许的 origin:
  - `capacitor://localhost` (Android WebView)
  - `https://localhost` (iOS WebView)
  - `http://localhost` / `http://localhost:5173`
  - `http://47.108.186.1` / `https://47.108.186.1`

**nginx (后备 CORS 头):**
- 配置文件: `frontend/nginx.conf`
- `/api/` 和 `/uploads/` 块都有 CORS 响应头
- OPTIONS 预检请求返回 204

### 环境变量 (.env)

```env
DOMAIN=47.108.186.1
DB_PASSWORD=amory_secret_2026
SECRET_KEY=<your-secret-key>
CORS_ORIGINS=http://localhost,http://localhost:5173,http://47.108.186.1,https://47.108.186.1,capacitor://localhost,https://localhost
```

### Docker 构建加速

Dockerfile 已配置国内镜像加速:
- apt: 阿里云镜像 (`mirrors.aliyun.com`)
- pip: 阿里云 PyPI (`mirrors.aliyun.com/pypi/simple/`)
- npm: npmmirror (`registry.npmmirror.com`)

## Android APK 构建

本地构建 (不在此服务器):
```bash
cd frontend
npm run build
npx cap sync android
# 在 Android Studio 中 Build APK
```

APK 配置:
- `capacitor.config.ts`: 无 `server.url` (本地打包模式)
- `api.ts`: `baseURL` 指向 `http://47.108.186.1/amory/api`
- `network_security_config.xml`: 信任 `47.108.186.1` 的自签证书

## 常用命令

```bash
# 查看日志
sudo docker compose logs -f backend
sudo docker compose logs -f frontend

# 重启服务
sudo docker compose restart backend

# 进入容器调试
sudo docker exec -it amory-backend bash
sudo docker exec -it amory-frontend sh

# 测试 CORS
curl -I -X OPTIONS http://47.108.186.1/amory/api/ \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET"
```
