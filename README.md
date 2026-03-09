# 🧠 Memora — Your AI-Powered Second Brain

> A full-stack personal AI assistant that remembers, learns, decides, and grows with you.

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4)](https://lovable.dev)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)](https://tailwindcss.com)

---

## ✨ Features

### 🤖 Neural Chat
- AI conversations powered by Google Gemini 3 Flash
- **Server-Sent Events (SSE)** for real-time token streaming
- Persistent conversation history stored in database
- Markdown rendering with syntax highlighting
- Fallback responses for resilience

### 🕐 Memory Timeline
- Save timestamped memories with categories & tags
- Full-text search and filter by category
- Never forget an important thought again

### 📚 Learning Vault
- Organize notes, articles, and knowledge by category
- File attachments support
- Tag-based organization system
- Duplicate prevention via unique index

### 🎯 Habit Loop
- Create and track daily/weekly habits
- Streak tracking with visual progress
- Category-based habit organization
- Habit logging with notes

### ⚖️ Decision Assistant
- AI-powered pros/cons analysis
- Risk scoring for each decision
- Option comparison with AI recommendations
- Status tracking (pending → decided)

### 🎙️ Voice AI *(Beta)*
- Voice-to-text transcription
- AI response to spoken thoughts
- Session duration tracking

### 📊 Dashboard
- Unified view of all modules
- Quick stats and recent activity
- Navigation hub for all features

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui + custom dark theme |
| **State** | TanStack React Query |
| **Routing** | React Router v6 (nested layouts) |
| **Backend** | Supabase (Lovable Cloud) |
| **Database** | PostgreSQL with RLS policies |
| **AI** | Google Gemini 3 Flash via Lovable AI Gateway |
| **Auth** | Supabase Auth (email + password) |
| **Edge Functions** | Deno (Supabase Edge Functions) |

---

## 🔐 Security & Production Features

### Authentication & Authorization
- Email + password authentication with email verification
- Protected routes with `ProtectedRoute` wrapper
- Row-Level Security (RLS) on **all 13 tables**
- Users can only access their own data

### Backend Hardening
- **Input validation** — message format, role, type, and 10k char limit
- **Request size limits** — 1MB max body size
- **Rate limiting** — 60 requests/minute per user
- **Monthly quotas** — Plan-aware (200 free / 2,000 paid messages)
- **Prompt injection filter** — 10 regex patterns block manipulation attempts
- **Error sanitization** — Internal details stripped before client response
- **Request logging** — All API calls logged with status, timing, and errors
- **AI timeout** — 30-second abort controller prevents hanging requests
- **Token usage tracking** — Per-user monthly token consumption

### Database Performance
- **23 custom indexes** across all tables for optimized queries
- Composite indexes on `(user_id, created_at)` patterns
- Unique constraint on learning items to prevent duplicates

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # AppLayout, AppSidebar, MobileNav
│   ├── ui/              # shadcn/ui components (40+ components)
│   ├── NavLink.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx   # Auth state management
├── hooks/
│   ├── use-mobile.tsx    # Responsive breakpoint hook
│   └── use-toast.ts      # Toast notifications
├── integrations/
│   └── supabase/         # Auto-generated client & types
├── pages/
│   ├── Landing.tsx       # Marketing landing page
│   ├── Auth.tsx          # Login & signup
│   ├── Dashboard.tsx     # Main dashboard
│   ├── Chat.tsx          # Neural Chat with streaming
│   ├── Memories.tsx      # Memory Timeline
│   ├── LearningVault.tsx # Knowledge management
│   ├── HabitLoop.tsx     # Habit tracking
│   ├── DecisionAssistant.tsx # Decision analysis
│   ├── VoiceAI.tsx       # Voice interface (Beta)
│   ├── Settings.tsx      # Profile & password
│   ├── Billing.tsx       # Subscription management
│   └── NotFound.tsx      # 404 page
└── lib/
    └── utils.ts          # Utility functions

supabase/
├── config.toml           # Supabase configuration
└── functions/
    └── chat/
        └── index.ts      # AI chat edge function (365 lines)
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User display names, avatars, preferences |
| `conversations` | Chat conversation threads |
| `messages` | Individual chat messages (user & assistant) |
| `memories` | Timestamped memories with categories & tags |
| `learning_items` | Notes and knowledge entries |
| `learning_files` | File attachments for learning items |
| `habits` | Habit definitions with frequency & streaks |
| `habit_logs` | Daily habit completion logs |
| `decisions` | Decision records with pros/cons/options |
| `voice_sessions` | Voice transcripts and AI responses |
| `subscriptions` | User subscription plans (free/paid) |
| `usage_counters` | Monthly message & token usage tracking |
| `api_logs` | Request logging for monitoring |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint with ESLint |

---

## 🎨 Design System

- **Theme**: Dark-first design with cyan primary (`hsl(187, 80%, 48%)`) and amber accent
- **Typography**: Inter (UI) + JetBrains Mono (code)
- **Components**: 40+ shadcn/ui components with custom variants
- **Responsive**: Mobile-first with collapsible sidebar navigation
- **Animations**: CSS transitions and backdrop blur effects

---

## 📄 License

This project is private. All rights reserved.

---

<p align="center">
  Built with ❤️ </a>
</p>
