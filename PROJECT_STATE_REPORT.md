# 📊 Sonar — Comprehensive Project State Report

> **Generated on:** September 27, 2026  
> **Repository:** `Aayushdt/Sonar`  
> **Working Branch:** `main`  
> **Latest Status:** ✅ Critical Fixes & Video SDK Capabilities Implemented  
> **Build Status:** ✅ Production Build Passing (Vite 8.3 + React 19)

---

## 1. Executive Summary

**Sonar** is a full-stack real-time 1-to-1 video calling and ephemeral messaging platform built on the **MERN** stack (MongoDB, Express, React, Node.js), powered by **Daily.co** (`@daily-co/daily-js`) for managed Selective Forwarding Unit (SFU) audio/video streaming, and **Socket.io** for real-time signaling, peer presence, and in-call chat.

The project features a **tactile acoustic editorial design aesthetic** with custom typography (Syne, Instrument Serif, Plus Jakarta Sans, JetBrains Mono), reactive audio visualizers, warm earthy color tokens, fluid micro-interactions via `motion`, and full light/dark theme switching.

---

## 2. Recent Upgrades & Architectural Enhancements

### 🔴 Critical Reliability & Security Fixes
1. **Call Invitation Timeout (~30s)**:
   - Server registers a 30-second timeout timer on `call:invite`.
   - If the callee does not accept or decline within 30 seconds, the server emits `call:missed` to both peers, logs an immutable record with `status: 'missed'` to MongoDB, and removes the pending session from active memory.
   - Caller can also actively cancel outgoing invites via `call:cancel`.
2. **Dynamic CORS Configuration**:
   - Replaced hardcoded `localhost:5173` origins in both Express and Socket.io with `process.env.CLIENT_URL || 'http://localhost:5173'` with credential support.
3. **API Rate Limiting**:
   - Integrated `express-rate-limit` to protect `/api/auth/login` and `/api/auth/register` (20 attempts per 15-minute window per IP) against brute-force attacks.
4. **Fail-Fast Environment Validation**:
   - Server bootstrap checks `MONGO_URI`, `JWT_SECRET`, and `DAILY_API_KEY`. If critical variables are missing, the server halts immediately with an explicit, actionable error banner rather than crashing mysteriously during a call.
5. **Presence Auto-Reconnection**:
   - Added automatic `user:identify` re-emission on Socket.io's `reconnect` and `connect` events, preventing presence state from going stale after network blips.
6. **Call History Pagination**:
   - `GET /api/calls` now supports `?page=1&limit=8` with `{ calls, pagination: { page, limit, total, totalPages, hasMore } }`.
7. **Database Indexing**:
   - Added compound and single indexes to MongoDB `calls` collection:
     - Compound index: `{ caller: 1, receiver: 1, createdAt: -1 }`
     - Index: `{ caller: 1, createdAt: -1 }`
     - Index: `{ receiver: 1, createdAt: -1 }`
8. **Friendly Error Surfacing**:
   - Surfaced Daily.co's `camera-error`, `nonfatal-error`, and permission denial events directly in the UI as descriptive warning banners rather than rendering a silent blank tile.

### 🟢 Video SDK Feature Integrations
1. **Screen Sharing**:
   - Native integration with Daily.co's `startScreenShare()` and `stopScreenShare()`.
   - Floating control deck button with active screen share HUD.
2. **Acoustic Background Blur**:
   - Integrated input processor toggle: `updateInputSettings({ video: { processor: { type: 'background-blur' } } })`.
3. **Acoustic Noise Cancellation (Krisp ANC)**:
   - Integrated audio processor toggle: `updateInputSettings({ audio: { processor: { type: 'noise-cancellation' } } })`.
4. **Favorite Contacts & Friend List**:
   - Extended `User.js` with `friends: [ObjectId]` array.
   - Added `POST /api/auth/friends/:friendId` and `GET /api/auth/friends` to star/favorite frequent peers in the signal directory.

### 🟡 UX & Real-Time Polish
1. **Typing Indicators**:
   - Chat box emits `chat:typing` and `chat:stop-typing` with 1400ms debounce.
   - Visual acoustic bounce dots inform peer when someone is typing.
2. **Read Receipts**:
   - Messages track transmission vs read status (`chat:read` event).
   - Display `✓` Delivered or `✓✓` Read checkmarks on sent messages.
3. **Browser Notification API**:
   - When tab is blurred/backgrounded, incoming transmissions trigger native OS desktop notifications.
4. **Reconnecting Network State**:
   - Monitored `network-connection` Daily events. If packet loss or network drop occurs, CallRoom displays a "Transmission Interrupted // Reconnecting" HUD overlay instead of freezing.

---

## 3. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (Vite + React)                  │
│                                                                        │
│  • AuthContext (JWT Storage & Session Restoration)                     │
│  • SocketContext (WebSocket Connection & Auto-Reconnection)            │
│  • useDailyCall (Daily SDK, Screen Share, Blur, Noise Cancellation)    │
│  • UI Views (Dashboard, IncomingCallModal, CallRoom, ChatBox)          │
└───────────────────┬──────────────────────────┬─────────────────────────┘
                    │                          │
       HTTP REST    │        WebSocket         │ Media Streams
       (Auth & Log) │     (Signaling & Chat)   │ (Audio / Video / SFU)
                    ▼                          ▼
┌───────────────────┴──────┐             ┌─────┴─────────────────────────┐
│     NODE.JS / EXPRESS    │             │           DAILY.CO            │
│       (Port 5000)        │             │    MANAGED INFRASTRUCTURE     │
│                          │  REST API   │                               │
│ • Express REST Routes    │────────────▶│ • Cloud SFU Media Relays      │
│ • Rate Limiting & Auth   │ (POST/rooms)│ • Screen Sharing Track Relay  │
│ • Socket.io Engine       │             │ • Background Blur & Krisp ANC │
│ • User-Socket State Map  │             │ • Automatic TURN/ICE Fallback │
│ • 30s Invite Timeout     │             └───────────────────────────────┘
│ • MongoDB Mongoose Layer │
└─────────────┬────────────┘
              │
              │ Mongoose Driver (Port 27017)
              ▼
┌──────────────────────────┐
│      MONGODB SERVER      │
│  • users (Auth & Friends)│
│  • calls (Indexed Logs)  │
└──────────────────────────┘
```

---

## 4. Technology Stack & Dependencies

### Root Orchestration
- **Package Manager:** `npm`
- **Start Script:** `start.sh` (POSIX bash runner with file-watcher limit tuner, MongoDB service check, and multi-process background management)

### Frontend (`client/`)
| Library | Version | Role |
|:---|:---|:---|
| `react` / `react-dom` | `19.2.8` | Core UI library |
| `vite` | `8.3.0` | Fast build tool & HMR dev server |
| `@daily-co/daily-js` | `0.92.2` | Daily.co WebRTC call object SDK |
| `socket.io-client` | `4.8.4` | WebSocket client for signaling and presence |
| `react-router-dom` | `7.18.4` | Client-side routing and protected routes |
| `lucide-react` | `1.48.0` | Icon system |
| `motion` | `13.4.4` | Framer Motion animations & transitions |
| `tailwindcss` | `3.4.19` | Utility-first responsive CSS engine |
| `postcss` / `autoprefixer`| `8.5.28` / `10.6.1`| CSS processing |
| `oxlint` | `1.81.0` | High-performance linter |

### Backend (`server/`)
| Library | Version | Role |
|:---|:---|:---|
| `node.js` | `>= 18.x` | JavaScript runtime |
| `express` | `4.19.2` | Web API framework |
| `express-rate-limit` | `7.5.0` | IP-based request throttling on auth routes |
| `socket.io` | `4.7.5` | WebSocket real-time event server |
| `mongoose` | `8.4.4` | MongoDB Object Data Modeling (ODM) |
| `jsonwebtoken` | `9.0.2` | JWT generation & signature verification |
| `bcryptjs` | `2.4.3` | Password hashing (10 salt rounds) |
| `node-fetch` | `3.3.2` | HTTP client for Daily.co REST API |
| `uuid` | `14.0.2` | Unique room/call identifier generation |
| `cors` | `2.8.5` | Cross-Origin Resource Sharing handling |
| `dotenv` | `16.4.5` | Environment variable loader |
| `nodemon` | `3.1.4` | Development auto-restart watcher |

---

## 5. Detailed Component & Module Audit

### 5.1 Frontend Modules (`client/src/`)

#### 1. Core Application Setup
- **`main.jsx`**: Bootstraps React root, integrates Google Fonts (Syne, Instrument Serif, Plus Jakarta Sans, JetBrains Mono).
- **`App.jsx`**:
  - Implements `BrowserRouter` with Theme Provider (`light` / `dark` via `localStorage`).
  - Configures route hierarchy:
    - `/login` → Unauthenticated public route.
    - `/register` → Unauthenticated public route.
    - `/dashboard` → Protected route with `Navbar` and `IncomingCallModal`.
    - `/call/:callId` → Protected route with active in-call workspace.
    - Fallback redirect to `/dashboard`.
- **`index.css` & `tailwind.config.js`**:
  - Defines the acoustic palette tokens (`surface`, `surface-2`, `sand`, `coral`, `brass`, `ink`).
  - Implements custom utility classes: `.editorial-card`, `.tactile-btn`, `.dial-border`, `.waveform-bar`.

#### 2. State & Context Providers
- **`AuthContext.jsx`**:
  - State: `user`, `token`, `loading`, `isAuthenticated`.
  - Persists token to `localStorage` (`sonar_token`).
  - Re-hydrates active user session on app load via `GET /api/auth/me`.
  - Exposes `login(email, password)`, `register(name, email, password)`, `logout()`.
- **`SocketContext.jsx`**:
  - Connects to backend via WebSocket (`import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'`).
  - Automatically emits `user:identify` on initial connection AND on Socket.io `reconnect` events.
  - Maintains `onlineUsers` state from incoming `presence:update` events.
  - Intercepts `call:incoming` to trigger global `IncomingCallModal` and sends background desktop notifications if tab is unfocused.
  - Manages `call:missed` and `call:cancelled` notifications and exposes `cancelCall(callId, recipientId)`.

#### 3. Custom Hooks
- **`useSocket.js`**:
  - Clean consumer hook for `SocketContext` exposing socket methods and signaling hooks.
- **`useDailyCall.js`**:
  - Encapsulates Daily call object lifecycle: join, track binding, leave, and destroy.
  - Exposes media controls: `toggleAudio()`, `toggleVideo()`, `toggleScreenShare()`, `toggleBackgroundBlur()`, `toggleNoiseCancellation()`.
  - Surfaces hardware and permission errors (`camera-error`, `nonfatal-error`).
  - Tracks network quality state (`networkState`: `'connected'`, `'reconnecting'`, `'interrupted'`).

#### 4. Pages & Views
- **`Login.jsx` & `Register.jsx`**:
  - Editorial dual-pane layout with acoustic soundbar visualizer + credential form.
  - Rate-limit aware error handling.
- **`Dashboard.jsx`**:
  - **Online Stations / Active Frequency:** Lists connected peers with avatar initials, online badge, favorite star toggle, and "Call" button.
  - **Calling State & Cancellation:** When initiating a call, displays real-time calling state with instant "Cancel…" option.
  - **Acoustic Archive / Call Log:** Paginated call history table displaying remote party, local caller, status badge (`COMPLETED`, `MISSED`, `DECLINED`), call duration, and timestamp.
- **`CallRoom.jsx`**:
  - Orchestrates split video HUD + ephemeral text chat.
  - Elapsed timer, active call ID badge, and live streaming indicator.
  - Integrated with `useDailyCall` controls for mic, camera, screen sharing, background blur, and Krisp noise cancellation.

#### 5. Interactive Components
- **`Navbar.jsx`**: Branding header, live online user counter, user profile, and tactile theme switcher.
- **`IncomingCallModal.jsx`**: High-priority intercom modal with concentric pulse radar rings, caller details, and tactile Accept / Decline buttons.
- **`VideoCall.jsx`**: Renders main video feed, screen share overlay, local picture-in-picture (PIP), reconnecting notification HUD, and floating tactile controls.
- **`ChatBox.jsx`**: Ephemeral in-call chat widget with real-time typing indicators (`is transmitting…`), auto-scroll, and delivered (`✓`) / read (`✓✓`) receipts.

---

## 6. Real-Time Protocol Specification

```
Client A (Caller)              Server (Socket.io)             Client B (Callee)
       │                               │                              │
       │────── call:invite ───────────▶│ [Start 30s Timeout]          │
       │                               │────── call:incoming ────────▶│
       │                               │                              │ (Accept Clicked)
       │                               │◀───── call:accept ───────────│
       │                               │ [Clear 30s Timeout]          │
       │                         [Daily REST API]                     │
       │                         Create Room URL                      │
       │◀───── call:accepted ──────────┼────── call:accepted ────────▶│
       │                               │                              │
       │================== JOIN DAILY.CO SFU ROOM ====================│
       │                               │                              │
       │────── chat:typing ───────────▶│────── chat:typing ──────────▶│
       │────── chat:message ──────────▶│────── chat:message ─────────▶│
       │◀───── chat:read ──────────────┼────── chat:read ─────────────│
       │                               │                              │
       │────── call:end ──────────────▶│                              │
       │                               │ [Write Call Log to MongoDB]  │
       │◀───── call:end ───────────────┼────── call:end ─────────────▶│
```

---

## 7. Feature Verification & Operational Matrix

| Feature | Category | Status | Verification Detail |
|:---|:---|:---|:---|
| User Registration & Login | Auth | ✅ Complete | JWT + bcrypt 10 rounds; rate-limited (20 req / 15 min). |
| Real-time Presence | Signaling | ✅ Complete | Dynamic online badge, live counter, auto-reconnect identify. |
| 30s Invite Timeout | Signaling | ✅ Complete | Emits `call:missed` and records missed call in DB if unanswered. |
| Call Cancellation | Signaling | ✅ Complete | Caller can cancel pending invitation before remote pickup. |
| Video/Audio Calling | Media | ✅ Ready | Integrated via Daily.co managed SFU. |
| Screen Sharing | Media | ✅ Complete | Native `startScreenShare()` toggle with active HUD indicator. |
| Background Blur | Media | ✅ Complete | Native input video processor (`background-blur`). |
| Noise Cancellation | Media | ✅ Complete | Krisp ANC audio processor (`noise-cancellation`). |
| Hardware Error Surfacing | Error Handling| ✅ Complete | Surfaces camera/mic permission denial as prominent alerts. |
| Reconnecting State | Resilience | ✅ Complete | Daily network connection listener with reconnecting overlay. |
| Ephemeral In-Call Chat | Messaging | ✅ Complete | Zero DB footprint; active call socket relay. |
| Typing Indicators | UX | ✅ Complete | Debounced `chat:typing` events with animated UI bounce dots. |
| Read Receipts | UX | ✅ Complete | `✓` Delivered and `✓✓` Read checkmarks on sent messages. |
| Desktop Notifications | UX | ✅ Complete | HTML5 Notification API for incoming calls when unfocused. |
| Call History & Pagination | Persistence | ✅ Complete | Indexed MongoDB query with `?page=1&limit=8` controls. |
| Contact Star / Favorites | Social | ✅ Complete | User schema `friends` array with one-click star toggle. |
| Dual Theme System | UI/UX | ✅ Complete | Full Dark/Light theme switching persisted to `localStorage`. |
| Production Build | Build/CI | ✅ Complete | Vite 8.3 production build transforms 2,337 modules with 0 errors. |
