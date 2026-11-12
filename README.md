# JivikaHunt 🚀

> Fast, clean, and trustworthy job board for college freshers and interns in India.

JivikaHunt aggregates entry-level job opportunities and internships across India. Public job seekers can browse and filter clean, unbloated listings with direct application links pointing exclusively to official company career portals.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, JavaScript with JSDoc types, Node.js)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose](https://mongoosejs.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Security & Auth**: `bcryptjs` for password hashing, `jose` for stateless JWT session cookies, and `otplib` for admin TOTP 2FA
- **Image Pipeline**: [Sharp](https://sharp.pixelplumbing.com/) (WebP re-encoding and in-database storage)
- **Email Service**: [Resend](https://resend.com/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit and API tests), [Playwright](https://playwright.dev/) (End-to-End browser tests), `@axe-core/playwright` (Accessibility audits)
- **Documentation**: [docx](https://docx.js.org/) (automated Word document compilation)

---

## 📋 Prerequisites

Before getting started, make sure you have:

- **Node.js**: v20 LTS or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **MongoDB**: A free MongoDB Atlas cluster connection string (or local MongoDB running on `mongodb://127.0.0.1:27017/jivikahunt`)

---

## ⚡ Quick Start / Local Setup

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd jivikahunt
npm install
```

### 2. Configure Environment Variables

Copy the template environment file:

```bash
# On Linux/macOS
cp .env.example .env.local

# On Windows (PowerShell)
Copy-Item .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/jivikahunt?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
HASH_SALT=random_salt_for_ip_hashing
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

_(See `.env.example` for exhaustive explanations of every variable)._

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Code Quality

| Command                | Action                                               |
| ---------------------- | ---------------------------------------------------- |
| `npm test`             | Run unit and API tests with Vitest                   |
| `npm run test:watch`   | Run Vitest in interactive watch mode                 |
| `npm run test:e2e`     | Run Playwright end-to-end browser tests              |
| `npm run lint`         | Run ESLint static analysis                           |
| `npm run lint:fix`     | Automatically fix ESLint formatting/lint issues      |
| `npm run format:check` | Verify code formatting with Prettier                 |
| `npm run format`       | Auto-format files with Prettier                      |
| `npm run docs:build`   | Compile Markdown docs into `.docx` Word deliverables |

---

## 📁 Project Structure

```
jivikahunt/
├── app/                  # App Router: public pages, admin UI, and API route handlers
├── components/           # Reusable UI components (Header, Footer, JobCard, etc.)
├── content/              # Static informational pages in Markdown (about, privacy, etc.)
├── docs/
│   ├── src/              # Source documentation manuals in Markdown (01 to 13)
│   └── docx/             # Generated Word deliverables (.docx)
├── lib/                  # Shared utilities (db, siteConfig, auth, time, slug, validation)
├── models/               # Mongoose schema definitions (User, Job, Image, Report, etc.)
├── scripts/              # CLI automation scripts (docs:build, scheduled jobs, digest)
├── tests/                # Automated tests (unit, api, and e2e)
├── .env.example          # Annotated environment template
├── Procfile              # Heroku deployment configuration
└── README.md             # Project documentation
```

---

## 📖 Documentation

Complete manuals for administrators, contributors, and developers are located in `docs/src` and built into `.docx` files in `docs/docx`:

1. `01-project-overview`
2. `02-architecture-and-folder-guide`
3. `03-data-model`
4. `04-api-reference`
5. `05-security-guide`
6. `06-local-setup-and-environment-variables`
7. `07-deployment-and-operations`
8. `08-testing-guide`
9. `09-admin-guide`
10. `10-contributor-guide`
11. `11-seo-and-ads-playbook`
12. `12-troubleshooting-and-faq`
13. `13-decision-log`
14. `CHANGELOG`

To regenerate all Word documents:

```bash
npm run docs:build
```

---

## ⚖️ Legal Disclaimer

_We are not a recruiter. Always apply on the official company site._
