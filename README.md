# 🔊 Sonar — 1-to-1 Video Calling & Chat

A full-stack real-time video calling and ephemeral chat application built with the **MERN** stack, **Daily.co** for managed video/audio, and **Socket.io** for signaling & presence.

![MERN](https://img.shields.io/badge/Stack-MERN-47A248?style=flat-square)
![Daily.co](https://img.shields.io/badge/Video-Daily.co-2962FF?style=flat-square)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=flat-square)
![Tailwind](https://img.shields.io/badge/Styling-Tailwind_CSS-06B6D4?style=flat-square)

---

## ✨ Features

- **1-to-1 Video & Audio Calls** — Powered by Daily.co managed SFU (no manual WebRTC/ICE handling)
- **Client-Side Call Recording** — Record calls directly in the browser via `MediaRecorder` with no backend upload; mixes remote & local mirrored PIP video tracks on an offscreen `<canvas>` and combines local & remote audio via the Web Audio API (`AudioContext`). Exports automatically as `sonar-call-<timestamp>.webm`.
- **Screen Sharing & Audio/Video FX** — Full screen sharing support, background blur, and Krisp acoustic noise cancellation directly in the tactile HUD deck.
- **Real-Time Presence** — See who's online via Socket.io user tracking
- **Call Signaling** — Invite → Accept/Reject flow with instant notifications and 30s timeout protection
- **Ephemeral In-Call Chat** — Real-time text messaging during calls (not persisted)
- **Call History** — Completed calls logged to MongoDB with duration tracking
- **React StrictMode Resilient** — Singleton + deferred teardown pattern in `useDailyCall.js` preventing duplicate instance conflicts in React 18/19 development mode.
- **Dark/Light Theme** — Full dual-theme support with an earthy warm color palette
- **JWT Authentication** — Secure login/register with bcrypt password hashing

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP REST      ┌─────────────────────┐
│   React + Vite      │ ──────────────────→ │  Express + Node.js  │
│   (Port 5173)       │     WebSocket       │  (Port 5000)        │
│                     │ ←─────────────────→ │                     │
│  • AuthContext       │  Socket.io Events   │  • REST Routes       │
│  • SocketContext     │  (Signaling, Chat)  │  • Socket Handlers   │
│  • useDailyCall      │                     │  • Daily REST API    │
│  • Dashboard/Call UI │                     │  • MongoDB Models    │
└─────────────────────┘                     └──────────┬──────────┘
         │                                             │
         │  Media Streams                    Room API  │
         │  (Audio/Video)                   (POST)     │
         ▼                                             ▼
┌─────────────────────┐                     ┌─────────────────────┐
│     Daily.co SFU    │                     │      MongoDB        │
│  (Managed Cloud)    │                     │  (localhost:27017)  │
└─────────────────────┘                     └─────────────────────┘
```

---

## 📁 Project Structure

```
Sonar/
├── start.sh                    # 🚀 One-command project launcher
├── IMPLEMENTATION.md           # Detailed architectural blueprint
├── package.json                # Root scripts (server, client, install:all)
│
├── client/                     # Frontend — React + Vite + Tailwind CSS
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js      # Custom earthy color tokens & animations
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Router, theme toggle, protected routes
│       ├── index.css           # Tailwind directives & dark mode base
│       ├── store/
│       │   └── useRecordingStore.js # Zustand store for call recording UI state
│       ├── context/
│       │   ├── AuthContext.jsx  # JWT auth state (login, register, logout)
│       │   └── SocketContext.jsx # Socket.io connection & presence tracking
│       ├── hooks/
│       │   ├── useSocket.js     # Convenience wrapper for SocketContext
│       │   └── useDailyCall.js  # Daily.co call lifecycle (join, tracks, hangup)
│       ├── components/
│       │   ├── Navbar.jsx       # Top bar with online count & theme toggle
│       │   ├── IncomingCallModal.jsx  # Accept/Reject call popup
│       │   ├── VideoCall.jsx    # Video layout (remote main + local PIP)
│       │   └── ChatBox.jsx      # Ephemeral in-call chat widget
│       └── pages/
│           ├── Login.jsx        # Sign in form + brand panel
│           ├── Register.jsx     # Account creation form
│           ├── Dashboard.jsx    # Online users list + call history table
│           └── CallRoom.jsx     # Active call (video + chat)
│
└── server/                     # Backend — Express + Socket.io + MongoDB
    ├── server.js               # Entry point (Express, HTTP, DB, Socket.io)
    ├── .env                    # Environment variables (see below)
    ├── middleware/
    │   └── authMiddleware.js   # JWT verification for REST routes
    ├── models/
    │   ├── User.js             # Mongoose schema (name, email, password)
    │   └── Call.js             # Mongoose schema (caller, receiver, duration)
    ├── controllers/
    │   ├── authController.js   # register, login, getMe, getUsers
    │   └── callController.js   # getCallHistory
    ├── routes/
    │   ├── authRoutes.js       # /api/auth/*
    │   └── callRoutes.js       # /api/calls
    └── socket/
        └── socketHandlers.js   # All Socket.io events (presence, signaling, chat, call logging)
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|:---|:---|:---|
| **Node.js** | v18+ | Runtime for server & client |
| **npm** | v9+ | Package manager |
| **MongoDB** | v6+ | Database (local or [Atlas](https://www.mongodb.com/atlas)) |
| **Daily.co API Key** | — | Get one free at [daily.co/developers](https://www.daily.co/developers) |

### 1. Clone & Install

```bash
git clone <your-repo-url> Sonar
cd Sonar

# Install all dependencies (server + client)
npm run install:all
```

### 2. Configure Environment

Create/edit `server/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/sonar
JWT_SECRET=sonar_super_secret_jwt_key_local_dev_12345
PORT=5000
DAILY_API_KEY=your_daily_api_key_here
```

> ⚠️ **Replace `your_daily_api_key_here`** with your actual Daily.co API key from the [Daily Dashboard](https://dashboard.daily.co/).

### 3. Start Everything

**Option A — One command (recommended):**

```bash
./start.sh
```

This starts MongoDB, the backend server, and the frontend client all at once.

**Option B — Manual (3 terminals):**

```bash
# Terminal 1: MongoDB
mongod --dbpath /tmp/sonar-mongo

# Terminal 2: Backend server (Express + Socket.io on port 5000)
cd server && npm run dev

# Terminal 3: Frontend client (Vite on port 5173)
cd client && npm run dev
```

### 4. Open & Test

1. Open **http://localhost:5173** in a Chrome window → Register as **Alice**
2. Open **http://localhost:5173** in an Incognito window → Register as **Bob**
3. Alice sees Bob online → Click **📹 Call**
4. Bob sees the incoming call modal → Click **✓ Accept**
5. Both enter the video call room with live video, audio, chat, and controls

---

## 🧪 Testing Playbook

| Test | What to verify |
|:---|:---|
| **Presence** | Alice sees Bob as "Online", Bob sees Alice |
| **Reject Flow** | Bob declines → Alice sees "Call Declined" toast, no DB record |
| **Accept Flow** | Server creates Daily.co room → both navigate to `/call/:callId` |
| **Video/Audio** | Both see local PIP + remote main video, audio works |
| **Mute/Camera** | Toggle mic/camera → other peer sees the change |
| **Chat** | Send messages during call → instant delivery, auto-scroll |
| **Hang Up** | Click End Call → both return to Dashboard, call logged to MongoDB |
| **Tab Close** | Close browser mid-call → other peer gets `participant-left`, returns to Dashboard |

---

## 🎨 Theming

Sonar supports **Light** and **Dark** themes with a custom earthy/warm color palette.

Toggle via the 🌙/☀️ button in the Navbar. Theme preference is saved to `localStorage`.

The design system uses these token categories:
- **Surfaces** — `bg`, `surface`, `surface-2`
- **Typography** — `text`, `text-2`, `text-muted`
- **Primary** — Red/Coral accent
- **Secondary** — Rust/Terracotta
- **Accent** — Orange highlights
- **Semantic** — `success`, `warning`, `danger`, `info`

See [`IMPLEMENTATION.md` §8](./IMPLEMENTATION.md) for the complete color token specification.

---

## 📡 Socket.io Event Protocol

| Event | Direction | Purpose |
|:---|:---|:---|
| `user:identify` | Client → Server | Register userId → socketId mapping |
| `presence:update` | Server → All | Broadcast online user list |
| `call:invite` | Caller → Server | Initiate call to a recipient |
| `call:incoming` | Server → Callee | Show incoming call modal |
| `call:accept` | Callee → Server | Accept call → server creates Daily room |
| `call:accepted` | Server → Both | Send roomUrl to both peers |
| `call:reject` | Callee → Server | Decline call (no DB write) |
| `call:rejected` | Server → Caller | Show "Call Declined" notification |
| `call:started` | Client → Server | Record call startedAt timestamp |
| `chat:message` | Peer ↔ Server ↔ Peer | Ephemeral in-call text message |
| `call:end` | Peer → Server → Peer | End call, log to MongoDB |

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Frontend | React 19, Vite, Tailwind CSS 3 |
| Backend | Node.js, Express 4 |
| Realtime | Socket.io 4 |
| Video/Audio | Daily.co (`@daily-co/daily-js`) |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT + bcrypt |

---

## 📄 License

This project is for educational/portfolio purposes.

---

<p align="center">
  Built with ❤️ using the MERN stack + Daily.co
</p>
