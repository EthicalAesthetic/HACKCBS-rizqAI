# 🚀 Vercel Deployment Guide for RizqAI

This guide details how to deploy the entire RizqAI application (Next.js Frontend + Python FastAPI Multi-Agent Backend) on Vercel so that everything functions identically to localhost.

---

## Architecture Overview

RizqAI consists of two applications:
1. **Frontend (`frontend/`)**: Next.js 16 (App Router, React 19, TypeScript, Vanilla CSS).
2. **Backend (`backend/`)**: Python FastAPI + LangGraph Multi-Agent Architecture (SSE Streaming, yfinance, Supabase Auth).

On Vercel, the recommended and most reliable setup is deploying both as linked projects from the same GitHub repository:
- **Project 1: `rizqai-backend`** (Python Serverless Function via `@vercel/python`)
- **Project 2: `rizqai-frontend`** (Next.js Edge / Serverless)

---

## Step 1: Deploy Backend on Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
2. Select your GitHub repository (`HACKCBS-rizqAI`).
3. In **Project Configuration**:
   - **Project Name**: `rizqai-backend` (or your choice)
   - **Framework Preset**: Other
   - **Root Directory**: Click `Edit` and select **`backend`**
4. Expand **Environment Variables** and add the following keys:

| Environment Variable | Description / Example |
| :--- | :--- |
| `GROQ_API_KEY` | Your Groq API key for Llama 3 models |
| `GOOGLE_API_KEY` | (Optional) Google Gemini API Key |
| `OPENROUTER_API_KEY` | (Optional) OpenRouter API Key |
| `NEWS_API_KEY` | NewsAPI key for real-time market news |
| `SUPABASE_URL` | `https://[your-project-ref].supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret service role key |
| `JWT_SECRET` | Secret key for local JWT verification |
| `FRONTEND_ORIGIN` | `https://*.vercel.app` (or your frontend domain) |
| `DATABASE_URL` | (Optional) Supabase Postgres URL or defaults to SQLite in `/tmp` |

5. Click **Deploy**.
6. Once deployed, copy your assigned backend URL (e.g., `https://rizqai-backend.vercel.app`).
   - You can verify it by opening `https://rizqai-backend.vercel.app/health` — it will return `{"status": "healthy"}`.

> [!NOTE]
> Vercel has pre-configured functions with `maxDuration: 60` and `memory: 1024` in [`backend/vercel.json`](file:///home/hex/Projects/HACKCBS-rizqAI/backend/vercel.json) to support streaming multi-agent synthesis.

---

## Step 2: Deploy Frontend on Vercel

1. In your Vercel Dashboard, click **"Add New..." > "Project"** again.
2. Select the same GitHub repository (`HACKCBS-rizqAI`).
3. In **Project Configuration**:
   - **Project Name**: `rizqai` (or `rizqai-frontend`)
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: Click `Edit` and select **`frontend`**
4. Expand **Environment Variables** and add:

| Environment Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://rizqai-backend.vercel.app` (Your deployed backend URL from Step 1) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[your-project-ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |

5. Click **Deploy**.

---

## Step 3: Configure Supabase Auth Redirects

In your Supabase Dashboard:
1. Navigate to **Authentication > URL Configuration**.
2. Under **Site URL**, set: `https://[your-frontend-project].vercel.app`
3. Under **Redirect URLs**, add:
   - `https://[your-frontend-project].vercel.app/auth/callback`
   - `https://[your-frontend-project].vercel.app/auth/reset-password`

---

## Troubleshooting & Important Notes

- **Multi-Agent Execution Timeout**:
  - On the **Vercel Hobby (Free)** plan, serverless function executions have a maximum duration of **10 to 15 seconds**.
  - Complex multi-company comparative queries (`"Compare NVDA vs AMD"`) querying 9 financial tools can take 15–25 seconds.
  - If you encounter a `504 FUNCTION_INVOCATION_TIMEOUT` on Vercel Free tier:
    - Upgrade your Vercel project to **Pro** (which supports up to 300s durations).
    - **OR** deploy the backend container on [Render](https://render.com) / [Railway](https://railway.app) / [Fly.io](https://fly.io) using the included [`backend/dockerfile`](file:///home/hex/Projects/HACKCBS-rizqAI/backend/dockerfile), and keep the Next.js frontend on Vercel.
