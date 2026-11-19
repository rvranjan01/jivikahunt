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
   # Core Database & Security
   heroku config:set MONGODB_URI="mongodb+srv://..."
   heroku config:set JWT_SECRET="your_secure_32_char_jwt_secret_key"
   heroku config:set HASH_SALT="your_secure_random_salt_for_ip_hashes"
   heroku config:set NODE_ENV="production"
   heroku config:set ADMIN_2FA_REQUIRED="true"

   # Site & Public Configuration
   heroku config:set NEXT_PUBLIC_SITE_URL="https://jivikahunt.com"
   heroku config:set NEXT_PUBLIC_ADSENSE_CLIENT_ID="ca-pub-XXXXXXXXXXXXXXXX"
   heroku config:set NEXT_PUBLIC_ONESIGNAL_APP_ID="your_onesignal_app_id"
   heroku config:set NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
   heroku config:set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION="your_search_console_token"

   # Email Service (Resend)
   heroku config:set RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
   heroku config:set RESEND_FROM_EMAIL="JivikaHunt <alerts@jivikahunt.com>"

   # Telegram Auto-Post Alerts
   heroku config:set TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   heroku config:set TELEGRAM_CHANNEL_ID="@jivikahunt"
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```

### Heroku Scheduler Add-on & Automated Tasks

Install the free Heroku Scheduler add-on to automate background processes:

```bash
heroku addons:create scheduler:standard
```

Open the scheduler dashboard (`heroku addons:open scheduler`) and configure two recurring jobs:

| Task Name                   | Frequency                     | Command                             | Description                                                                                                              |
| :-------------------------- | :---------------------------- | :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Publish Scheduled Jobs**  | Every 10 minutes              | `node scripts/publish-scheduled.js` | Transitions scheduled vacancies whose publication timestamp has passed to published status.                              |
| **Send Daily Email Digest** | Daily (02:30 UTC / 08:00 IST) | `node scripts/daily-digest.js`      | Matches jobs published within the last 24 hours against confirmed subscriber preferences and sends personalized digests. |

Note: Standalone background scripts run outside the Next.js runtime. Public ISR listings update automatically on their 300-second revalidation cycle.

### Cloudflare Integration

Deploy Cloudflare in front of Heroku:

- **SSL/TLS Mode**: Full (Strict).
- **Edge Cache**: Configure Page Rule or Cache Rule for `https://jivikahunt.com/img/*` to Cache Everything with an Edge TTL of 1 year (`max-age=31536000`).
- **Security**: Enable Always Use HTTPS, Automatic HTTPS Rewrites, and Cloudflare WAF managed rules.

### Rollback Strategy:

If a production deployment introduces critical defects:

```bash
# View recent releases
heroku releases

# Roll back to the previous stable release
heroku releases:rollback v12
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
