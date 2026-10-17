# Production Deployment Guide: `ecsf-fellowship.com`

This guide explains how to deploy the **FTVTI ECSF Fellowship Student & Family Management System** online using the **Modern Cloud** architecture (Vercel + Render + Neon/Supabase PostgreSQL) under your domain **`ecsf-fellowship.com`**.

---

## Architecture Overview

```
                         Internet Users
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │       https://ecsf-fellowship.com     │
            │          (Vercel Global CDN)          │
            │          Frontend (React+Vite)        │
            └───────────────────┬───────────────────┘
                                │ API Calls (/api)
                                ▼
            ┌───────────────────────────────────────┐
            │     https://api.ecsf-fellowship.com   │
            │            (Render Web Service)       │
            │            Backend (Node/Express)     │
            └───────────────────┬───────────────────┘
                                │ SSL Connection
                                ▼
            ┌───────────────────────────────────────┐
            │         Cloud PostgreSQL DB           │
            │          (Neon.tech / Supabase)       │
            └───────────────────────────────────────┘
```

---

## Step 1: Create Free Cloud PostgreSQL Database

We recommend **[Neon.tech](https://neon.tech)** (free serverless Postgres) or **[Supabase](https://supabase.com)**.

1. Sign up at [Neon.tech](https://neon.tech) (or Supabase).
2. Create a new project named **`ecsf-fellowship`**.
3. Copy your **Connection String** (`DATABASE_URL`). It looks like:
   ```
   postgresql://alex:AbCdEf123@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. In the Neon or Supabase web dashboard, open the **SQL Editor** tab.
5. Open the file [`backend/database/production_setup.sql`](./backend/database/production_setup.sql) in this repository.
6. Copy the entire contents and paste them into the SQL Editor, then click **Run**.
   - This creates all required tables, constraints, indexes, triggers, analytical views, and initial seed records.

---

## Step 2: Push Repository to GitHub

1. Open PowerShell in your project folder (`C:\Users\hp\Documents\FTFV`):
   ```powershell
   git init
   git add .
   git commit -m "Initial commit for production deployment"
   ```
2. Go to [GitHub.com](https://github.com), click **New Repository**, name it `ecsf-fellowship` (choose **Private**).
3. Link and push your repository:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/ecsf-fellowship.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy Backend API on Render

1. Sign up / log in to [Render.com](https://render.com).
2. Click **New +** $\to$ **Web Service**.
3. Connect your GitHub repository `ecsf-fellowship`.
4. Configure the service settings:
   - **Name**: `ecsf-fellowship-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or Starter for higher memory)
5. Scroll down to **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Paste connection string from Step 1)* |
   | `JWT_SECRET` | *(Generate a random 64-char string)* |
   | `JWT_EXPIRES_IN` | `24h` |
   | `CORS_ORIGIN` | `https://ecsf-fellowship.com,https://www.ecsf-fellowship.com` |
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide a public URL like `https://ecsf-fellowship-api.onrender.com`.
   - Test it by visiting `https://ecsf-fellowship-api.onrender.com/api/health` in your browser. It should respond with `{"status":"healthy"}`.

---

## Step 4: Deploy Frontend on Vercel

1. Sign up / log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\to$ **Project**.
3. Import your GitHub repository `ecsf-fellowship`.
4. In the project setup screen:
   - **Root Directory**: Click edit and choose `frontend`.
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://api.ecsf-fellowship.com/api` *(or your Render URL: `https://ecsf-fellowship-api.onrender.com/api`)* |
6. Click **Deploy**. Vercel will build and launch your application globally in ~60 seconds.

---

## Step 5: Configure Custom Domain `ecsf-fellowship.com`

Where you bought your domain (Namecheap, GoDaddy, Cloudflare, Google Domains):

### 1. Point the Main Website to Vercel
1. In your **Vercel Project Dashboard**, go to **Settings** $\to$ **Domains**.
2. Enter `ecsf-fellowship.com` and click **Add**. Also add `www.ecsf-fellowship.com`.
3. In your Domain Registrar's **DNS Management**, add the DNS records shown by Vercel:
   | Type | Name / Host | Value / Target | TTL |
   | :--- | :--- | :--- | :--- |
   | **A** | `@` (or leave empty) | `76.76.21.21` | Automatic / 300 |
   | **CNAME** | `www` | `cname.vercel-dns.com.` | Automatic / 300 |

### 2. Point the Backend API Subdomain to Render
1. In your **Render Dashboard** (`ecsf-fellowship-api`), go to **Settings** $\to$ **Custom Domains**.
2. Click **Add Custom Domain** and enter: `api.ecsf-fellowship.com`.
3. In your Domain Registrar's **DNS Management**, add the CNAME record:
   | Type | Name / Host | Value / Target | TTL |
   | :--- | :--- | :--- | :--- |
   | **CNAME** | `api` | `ecsf-fellowship-api.onrender.com` | Automatic / 300 |

> **Note**: Both Vercel and Render automatically provision free Let's Encrypt SSL certificates (HTTPS) within 15–30 minutes after DNS records propagate.

---

## Step 6: Log In as Administrator

Once your site is live at `https://ecsf-fellowship.com`:
1. Navigate to the login page.
2. Sign in with the seeded administrator account:
   - **Username**: `admin_samuel`
   - **Password**: `Admin@123`
3. Navigate to **Accounts** and immediately update your password or create your personal Administrator account.
