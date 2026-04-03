# AIXOS by Tradmak

## Overview
An AI-driven CRM and support operations platform. Provides an "Intelligence Layer" for managing customer interactions, support inquiries, and automated chatbot monitoring using Google Gemini AI.

## Architecture
- **Frontend:** React 19 + TypeScript, Vite build tool, Zustand state management
- **Routing:** react-router-dom v7 with HashRouter
- **AI:** Google Gemini (`@google/genai`) via `GEMINI_API_KEY` env var
- **Database/Auth:** Supabase (hardcoded URL and publishable key in `services/supabase.ts`)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Styling:** Tailwind CSS (via CDN in index.html)

## Project Layout
- `App.tsx` — Main shell, routing, auth guards (Admin vs Agent roles)
- `pages/` — Route-level components (Dashboard, AIChat, Conversations, DeepResearch, Emails, Channels, Contacts, ChatbotMonitor, Inquiries, Resources, Settings, Login)
- `components/` — Reusable UI (Sidebar, ChatWidget)
- `services/` — External integrations (ai.service.ts, supabase.ts)
- `store/useStore.ts` — Zustand global store
- `types.ts` — TypeScript interfaces
- `schema.sql` — Supabase PostgreSQL schema

## Environment Variables
- `GEMINI_API_KEY` — Google Gemini API key (set in `.env.local` or Replit Secrets)

## Dev Server
- Runs on port 5000 (`npm run dev`)
- Host: `0.0.0.0`, all hosts allowed for Replit proxy

## Deployment
- Static site deployment: `npm run build` → `dist/`
