# 07 — Deployment and Operations

## 1. Hosting Architecture Overview

JivikaHunt is designed for cloud portability. The primary production deployment targets Heroku Dynos with Cloudflare DNS & CDN in front, backed by MongoDB Atlas. It can also be deployed to Azure App Service or any standard Linux VPS.

## 2. Heroku Deployment (Primary)

- **Procfile**: `web: npm start`
- **Buildpacks**: `heroku/nodejs`
- **Engines**: Explicitly configured in `package.json` (`node: >=20.0.0`, `npm: >=10.0.0`).

### Deployment Steps:

1. Create Heroku App:
   ```bash
   heroku create jivikahunt-prod
   ```
2. Set Production Environment Variables:
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://..."
   heroku config:set JWT_SECRET="..."
   heroku config:set HASH_SALT="..."
   heroku config:set NEXT_PUBLIC_SITE_URL="https://jivikahunt.com"
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```

## 3. Alternative VPS / Azure Deployment

Run using Node.js process managers like PM2:

```bash
npm run build
pm2 start npm --name "jivikahunt" -- start
```

Configure Nginx as a reverse proxy passing port 3000 with SSL certificates from Let's Encrypt.

## 4. Database Backups & Restore

MongoDB Atlas Free/M0 tier includes continuous monitoring. For production backups:

- Use `mongodump` for automated scheduled dumps:
  ```bash
  mongodump --uri="<MONGODB_URI>" --out=/backups/$(date +%F)
  ```
- Restore with `mongorestore`:
  ```bash
  mongorestore --uri="<MONGODB_URI>" /backups/<DATE>/jivikahunt
  ```

## 5. Monitoring & Health Checks

- Uptime monitoring tools (e.g. UptimeRobot, Better Uptime) should ping `/api/health` every 60 seconds.
- An alert is triggered if `/api/health` returns HTTP status 503 or takes longer than 2000ms.
