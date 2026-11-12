# 06 — Local Setup and Environment Variables

## 1. Prerequisites

Ensure you have the following installed on your development machine:

- **Node.js**: v20 LTS or later (`node -v`)
- **npm**: v10 or later (`npm -v`)
- **Git**: (`git --version`)
- A free MongoDB Atlas cluster connection string or a local MongoDB instance.

## 2. Step-by-Step Installation

### Step 1: Clone Repository & Install Dependencies

```bash
git clone <repository-url>
cd jivikahunt
npm install
```

### Step 2: Configure Environment Variables

Copy the template file to create your local environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and configure the essential variables:

- `MONGODB_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A random 32-character string (`openssl rand -base64 32`).
- `HASH_SALT`: A random salt string for IP hashing.
- `NEXT_PUBLIC_SITE_URL`: Set to `http://localhost:3000`.

### Step 3: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 3. Environment Variables Reference Table

| Variable                        | Required | Description                                    |
| ------------------------------- | -------- | ---------------------------------------------- |
| `MONGODB_URI`                   | Yes      | MongoDB Atlas connection string                |
| `JWT_SECRET`                    | Yes      | 32+ character key for JWT token signing        |
| `JWT_EXPIRY`                    | No       | Expiration time (default: `12h`)               |
| `HASH_SALT`                     | Yes      | Salt for hashing user IP addresses             |
| `ADMIN_TOTP_SECRET`             | No       | Default TOTP secret for admin initialization   |
| `RESEND_API_KEY`                | Optional | API key for transactional emails               |
| `RESEND_FROM_EMAIL`             | Optional | Sender address (e.g., `alerts@jivikahunt.com`) |
| `TELEGRAM_BOT_TOKEN`            | Optional | Bot token for channel auto-posting             |
| `TELEGRAM_CHANNEL_ID`           | Optional | Channel handle (e.g., `@jivikahunt`)           |
| `NEXT_PUBLIC_SITE_URL`          | Yes      | Canonical website URL                          |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Optional | Google AdSense publisher ID                    |
| `CONTRIBUTOR_DAILY_LIMIT`       | No       | Max posts per contributor/day (default: 30)    |
