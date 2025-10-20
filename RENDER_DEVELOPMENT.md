# Deploying Freedium to Render.com


This guide explains how to deploy the Freedium web application to Render.com.


## Prerequisites


- A Render.com account ([sign up here](https://render.com))
- A GitHub/GitLab account with this repository


## Architecture Overview


On Render.com, the docker-compose setup is replaced with managed services:


```
┌─────────────────────────────────────────────────────┐
│ Render.com Platform (provides)                      │
│ - Load Balancer                                      │
│ - HTTPS/SSL                                          │
│ - Auto-scaling                                       │
└───────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ freedium-web (Docker Container)                     │
│ - Built from Dockerfile.render                      │
│ - Listens on $PORT (assigned by Render)             │
└────────┬──────────────────────┬─────────────────────┘
        │                      │
        ↓                      ↓
┌──────────────────┐   ┌──────────────────┐
│ freedium-db      │   │ freedium-redis   │
│ (PostgreSQL)     │   │ (Redis)          │
│ Managed by Render│   │ Managed by Render│
└──────────────────┘   └──────────────────┘
```


## Deployment Methods


### Method 1: Using render.yaml (Recommended)


This method automatically provisions all services from the `render.yaml` blueprint.


1. **Push your code to GitHub/GitLab**
  ```bash
  git add .
  git commit -m "Add Render.com deployment configuration"
  git push
  ```


2. **Create a New Blueprint Instance on Render.com**
  - Go to [Render Dashboard](https://dashboard.render.com)
  - Click **"New" → "Blueprint"**
  - Connect your repository
  - Render will detect `render.yaml` and show all services to be created:
    - `freedium-web` (Web Service)
    - `freedium-db` (PostgreSQL Database)
    - `freedium-redis` (Redis)


3. **Configure Environment Variables**


  Render will auto-generate most variables, but you need to set:


  - **`HOST_ADDRESS`**: Your Render app URL
    - After first deploy, get the URL (e.g., `https://freedium-web.onrender.com`)
    - Update this environment variable with your actual URL


  - **`SENTRY_SDK_DSN`** (optional): If using Sentry for error tracking


4. **Deploy**
  - Click **"Apply"** to create all services
  - Render will:
    - Create PostgreSQL database
    - Create Redis instance
    - Build and deploy your Docker container
    - Connect everything automatically


5. **Update HOST_ADDRESS**
  - After deployment completes, note your app's URL
  - Go to `freedium-web` service → Environment
  - Update `HOST_ADDRESS` to your actual URL
  - Save and redeploy


### Method 2: Manual Setup


If you prefer manual control:


#### Step 1: Create PostgreSQL Database


1. Go to Render Dashboard → **"New" → "PostgreSQL"**
2. Configure:
  - **Name**: `freedium-db`
  - **Database**: `freedium`
  - **User**: `freedium`
  - **Region**: Choose closest to your users
  - **Plan**: Starter (or higher)
3. Click **"Create Database"**
4. Note the **Internal Database URL** (starts with `postgresql://`)


#### Step 2: Create Redis Instance


1. Go to Render Dashboard → **"New" → "Redis"**
2. Configure:
  - **Name**: `freedium-redis`
  - **Region**: Same as database
  - **Plan**: Starter
  - **Maxmemory Policy**: `allkeys-lru`
3. Click **"Create Redis"**
4. Note the **Internal Redis URL**


#### Step 3: Create Web Service


1. Go to Render Dashboard → **"New" → "Web Service"**
2. Connect your Git repository
3. Configure:
  - **Name**: `freedium-web`
  - **Region**: Same as database/redis
  - **Branch**: `main` (or your default branch)
  - **Runtime**: `Docker`
  - **Dockerfile Path**: `./Dockerfile.render`
  - **Plan**: Starter (or higher)


4. **Add Environment Variables**:


  Required:
  ```
  HOST_ADDRESS=https://your-app-url.onrender.com  (update after first deploy)
  ADMIN_SECRET_KEY=<generate-random-string>
  DATABASE_URL=<paste-postgres-internal-url>
  REDIS_HOST=<paste-redis-internal-host>
  REDIS_PORT=<paste-redis-internal-port>
  ```


  Optional:
  ```
  TIMEOUT=15
  REQUEST_TIMEOUT=12
  WORKER_TIMEOUT=85
  CACHE_LIFE_TIME=18000
  LOG_LEVEL_NAME=INFO
  DISABLE_EXTERNAL_DOCS=true
  SENTRY_SDK_DSN=<your-sentry-dsn>
  ```


5. Click **"Create Web Service"**


6. **After first deployment**:
  - Note your app's URL (e.g., `https://freedium-web.onrender.com`)
  - Update `HOST_ADDRESS` environment variable
  - Trigger a manual redeploy


## Important Configuration Notes


### Required Services


The application **requires** both PostgreSQL and Redis:


- **PostgreSQL**: Used for article caching and storage
- **Redis**: Used for session management and fast caching


The app will fail to start without both services available.


### Environment Variables Explained


| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST_ADDRESS` | Yes | - | Your app's public URL (e.g., `https://freedium-web.onrender.com`) |
| `ADMIN_SECRET_KEY` | Yes | - | Secret key for admin endpoints (generate a random string) |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (auto-provided by Render) |
| `REDIS_HOST` | Yes | - | Redis hostname (auto-provided by Render) |
| `REDIS_PORT` | Yes | - | Redis port (auto-provided by Render) |
| `TIMEOUT` | No | 38 | Request timeout in seconds |
| `REQUEST_TIMEOUT` | No | 12 | HTTP request timeout |
| `CACHE_LIFE_TIME` | No | 18000 | Cache TTL in seconds (5 hours) |
| `SENTRY_SDK_DSN` | No | - | Sentry error tracking DSN |
| `MEDIUM_AUTH_COOKIES` | No | - | Medium subscription cookies (uid, sid) if you have paid subscription |
| `PROXY_LIST` | No | - | Comma-separated proxy list (not needed on Render) |


### Features Not Available on Render.com


The following features from the local docker-compose setup won't work on Render.com:


- **Caddy Reverse Proxy**: Render provides its own load balancer and SSL
- **Cloudflare WARP Proxies**: Not supported in Render's container environment
- **HAProxy**: Not needed, Render handles load balancing
- **pgAdmin**: Can't run as sidecar; use Render's database dashboard or external pgAdmin
- **Plausible Analytics**: Deploy separately if needed


## Troubleshooting


### Application won't start


1. **Check PostgreSQL connection**:
  - View logs: `freedium-web` → Logs
  - Look for: `"Successfully connected to PostgreSQL"`
  - If failing: Verify `DATABASE_URL` is set correctly


2. **Check Redis connection**:
  - Verify `REDIS_HOST` and `REDIS_PORT` are set
  - Ensure Redis instance is running


3. **Port binding issues**:
  - Render provides `$PORT` automatically
  - `Dockerfile.render` should handle this with `${PORT:-7080}`


### Health check failing


- The app exposes a health check endpoint at `/`
- Check if the app is listening on the correct port
- View container logs for startup errors


### Database migrations


The app automatically initializes the database on startup (see `web/server/__init__.py:48-54`):
```python
wait_for_postgres()  # Waits for DB to be ready
medium_cache.init_db()  # Initializes tables
```


No manual migration needed.


## Monitoring and Logs


- **Application Logs**: `freedium-web` service → Logs tab
- **Database Metrics**: `freedium-db` → Metrics tab
- **Redis Metrics**: `freedium-redis` → Metrics tab


## Cost Estimation (Starter Plans)


- Web Service: $7/month (includes 0.5 GB RAM, 0.5 CPU)
- PostgreSQL: $7/month (includes 1 GB storage)
- Redis: $10/month (includes 25 MB storage)


**Total**: ~$24/month for basic setup


Free tier available but with limitations (services sleep after inactivity).


## Scaling


To handle more traffic:


1. **Upgrade Web Service Plan**: More CPU/RAM
2. **Enable Autoscaling**: Render can auto-scale based on load
3. **Upgrade Database Plan**: More connections, storage, performance
4. **Upgrade Redis Plan**: More memory for caching


## Security Notes


1. **Always generate a strong `ADMIN_SECRET_KEY`**:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```


2. **Never commit `.env` files** with secrets to Git


3. **Use Render's Environment Variables** for secrets (encrypted at rest)


4. **Keep dependencies updated**: Render can auto-deploy on Git push


## Support


- Render.com Docs: https://render.com/docs
- Freedium Issues: https://codeberg.org/Freedium-cfd/web/issues
- Render Community: https://community.render.com/