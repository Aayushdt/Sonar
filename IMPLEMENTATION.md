# Comprehensive Implementation Plan: MERN + Daily.co 1-to-1 Video Calling & Chat

This document details the complete architectural design, engineering decisions, and step-by-step implementation blueprint for building a local 1-to-1 video calling and ephemeral chat application using the **MERN** stack (MongoDB, Express, React, Node.js), **Daily.co** (`@daily-co/daily-js`) for audio/video calling, and **Socket.io** for real-time presence, call signaling, and in-call ephemeral chat.

---

## 1. Executive Architecture Overview

```
+---------------------------------------------------------------------------------+
|                                 CLIENT A (Vite + React)                        |
|  - AuthContext (JWT via REST)                                                   |
|  - SocketContext (Signaling, user:identify & Presence)                          |
|  - useDailyCall (DailyIframe call object, track event listeners)               |
|  - UI (Dashboard, IncomingCallModal, CallRoom, ChatBox)                         |
+------------------------+-------------------+------------------------------------+
                         |                   |
        HTTP REST API    |   WebSocket       | Media Streams
     (Auth & Call History| (Signaling & Chat)| (Audio / Video / SFU Relay)
          via GET)       |                   |
                         v                   v
+------------------------+-------------------+             +----------------------+
|              SERVER (Express + Node.js)    |             |       DAILY.CO       |
|  - Express REST Routes (/api/auth, /calls) |   Room API  | MANAGED INFRASTRUCTURE|
|  - JWT Middleware (REST Authentication)    | ----------> | - Managed SFU relay  |
|  - Daily REST API Client (POST /v1/rooms)  | (POST/rooms)| - Auto TURN fallback |
|  - Socket.io Server (socketHandlers.js)    |             | - Media optimization |
|  - In-Memory User-Socket Map (userId->sock)|             +----------------------+
|  - MongoDB (Users & Connected Calls Log)   |                        ^
+------------------------+-------------------+                        |
                         ^                                            |
                         |               WebSocket                    | Media Streams
        HTTP REST API    |           (Signaling & Chat)               | (Audio/Video/SFU)
                         |                                            |
+------------------------+-------------------+------------------------+------------+
|                                 CLIENT B (Vite + React)                          |
|  - useDailyCall (DailyIframe call object, track event listeners)                 |
+----------------------------------------------------------------------------------+
```

---

## 2. Technology Stack & Technical Rationale

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18+ via Vite** | Fast HMR, lightweight bundling, clean standard React hook paradigms (`useRef`, `useEffect`). Vite is significantly faster and cleaner than deprecated Create React App. |
| **Styling** | **Tailwind CSS** | Utility-first classes, faster iteration, built-in dark mode variant support, smaller hand-written CSS surface area. Extends theme colors directly to preserve the custom earth/warm aesthetic across light and dark modes. |
| **Backend Runtime & API** | **Node.js + Express** | High concurrency event-driven model, standard for micro-services and WebSockets, minimal setup for REST endpoints. |
| **Signaling Layer** | **Socket.io** | Bidirectional low-latency event-based transport with built-in reconnection, heartbeat/ping-pong, and direct socket targeting. Powers presence, call invitations/acceptance, and in-call chat. |
| **Database & ODM** | **MongoDB + Mongoose** | Flexible document model for storing `User` profiles (auth) and immutable `Call` logs of connected calls. Low operational overhead for local development. |
| **Authentication** | **JWT (`jsonwebtoken`) + `bcrypt`** | Stateless authentication. Passwords hashed using bcrypt (10 salt rounds). Tokens verified by Express middleware for REST endpoints. |
| **Video/Audio Layer** | **Daily.co (`@daily-co/daily-js`)** | Managed SFU, automatic TURN fallback, no manual ICE/SDP handling needed. Handles media acquisition, codec negotiation, bandwidth adaptation, and hardware track toggles seamlessly. |

### Auth Storage Decision: `localStorage` vs. `httpOnly` Cookie
- **Decision for this Project**: **`localStorage` with Authorization Bearer header for REST APIs**.
- **Rationale**:
  1. *Simplicity & Decoupled Frontend/Backend*: Local development runs across separate ports (`localhost:5173` for Vite and `localhost:5000` for Express). With `localStorage`, we avoid cross-origin cookie configuration hurdles (e.g. `SameSite=None; Secure` requirements that fail on plain HTTP).
  2. *Interview Explanation*: In production banking/fintech apps, `httpOnly`, `Secure`, `SameSite=Strict` cookies are preferred to mitigate XSS risks. For local decoupled SPA development, Authorization Bearer tokens via `localStorage` or in-memory state provide explicit control over token transmission.

### Socket.io Authentication Simplification Note
- In this project, the Socket.io connection is established without verifying the JWT during the initial WebSocket handshake (no `io.use()` auth middleware).
- Instead, upon connecting, the client immediately emits a `user:identify` event carrying their `userId` (which the client already obtained from the authenticated REST login/register response). The server trusts this identifier and binds `userId -> socketId`.
- **Intentional Architecture Trade-off**: In a production enterprise system, the JWT would be verified inside the `io.use()` handshake middleware to prevent identity spoofing across WebSocket connections. For this local project, post-connection identification avoids connection rejection complexities and keeps the signaling setup lean and transparent.

---

## 3. Monorepo Project Structure

```
Sonar/
├── client/                               # Frontend React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js                # Tailwind CSS configuration with custom theme tokens
│   ├── postcss.config.js                 # PostCSS configuration (tailwindcss, autoprefixer)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css                     # Tailwind directives (@tailwind base, components, utilities)
│       ├── context/
│       │   ├── AuthContext.jsx           # User state, login, register, logout
│       │   └── SocketContext.jsx         # Socket.io connection, user:identify & presence
│       ├── hooks/
│       │   ├── useSocket.js              # Hook for accessing socket instance & signaling
│       │   └── useDailyCall.js           # Encapsulated Daily call object lifecycle, track events & toggles
│       ├── components/
│       │   ├── Navbar.jsx                # User info, online indicator, logout button
│       │   ├── IncomingCallModal.jsx     # Accept / Reject popup modal
│       │   ├── VideoCall.jsx             # Video player layout (local PIP, remote main)
│       │   └── ChatBox.jsx               # Ephemeral in-call chat widget
│       └── pages/
│           ├── Login.jsx                 # Email & password login form
│           ├── Register.jsx              # Account creation form
│           ├── Dashboard.jsx             # Active users list, "Call" actions, past call history
│           └── CallRoom.jsx              # Active call view combining VideoCall and ChatBox
│
├── server/                               # Backend Node.js + Express + Socket.io
│   ├── package.json
│   ├── server.js                         # Express setup, HTTP server creation, DB connection
│   ├── .env.example                      # Environment variables template (MONGO_URI, JWT_SECRET, PORT, DAILY_API_KEY)
│   ├── middleware/
│   │   └── authMiddleware.js             # JWT verification middleware for Express REST routes
│   ├── models/
│   │   ├── User.js                       # Mongoose User schema (email, name, passwordHash)
│   │   └── Call.js                       # Mongoose Call schema (caller, receiver, startedAt, endedAt, durationSeconds)
│   ├── controllers/
│   │   ├── authController.js             # registerUser, loginUser, getCurrentUser
│   │   └── callController.js             # getCallHistory (reads completed calls from MongoDB)
│   ├── routes/
│   │   ├── authRoutes.js                 # /api/auth/register, /login, /me
│   │   └── callRoutes.js                 # /api/calls (GET history)
│   └── socket/
│       └── socketHandlers.js             # Single source of truth for Socket.io events, Daily REST API calls & Call persistence
│
└── IMPLEMENTATION.md                     # This master architectural blueprint
```

---

## 4. Incremental Implementation Phases

### Phase 1: Foundation & Authentication (JWT + bcrypt)

#### Objectives
- Initialize the monorepo structure.
- Build server-side user registration, password hashing with bcrypt, JWT token generation, and verification middleware for Express.
- Build client-side auth context, persistent token loading, and protected routes.

#### Backend Implementation Details
1. **Mongoose Schema (`server/models/User.js`)**:
   - `name`: String, required, trimmed.
   - `email`: String, required, unique, lowercase, trimmed.
   - `password`: String, required (hashed).
   - `timestamps`: true (`createdAt`, `updatedAt`).
2. **Controller (`server/controllers/authController.js`)**:
   - `register`: Validates email uniqueness -> Hashes password (`bcrypt.hash(password, 10)`) -> Saves user -> Generates JWT signed with `JWT_SECRET` (expires in 7 days) -> Returns user info (omitting password) + token.
   - `login`: Finds user by email -> Compares password (`bcrypt.compare(password, user.password)`) -> Generates JWT -> Returns user info + token.
   - `getMe`: Route protected by `authMiddleware.js` -> Returns user profile for session re-hydration.
3. **Middleware (`server/middleware/authMiddleware.js`)**:
   - Extracts header `Authorization: Bearer <token>`.
   - Verifies with `jwt.verify(token, process.env.JWT_SECRET)`.
   - Attaches `req.user = decoded` to request; returns `401 Unauthorized` if invalid/expired.

#### Frontend Implementation Details
1. **`AuthContext.jsx`**:
   - Holds state: `user`, `token`, `isAuthenticated`, `loading`.
   - On mount, checks `localStorage.getItem('sonar_token')`. If present, calls `/api/auth/me` to validate.
   - Exposes `login(email, password)`, `register(name, email, password)`, `logout()`.
2. **Protected Route Component**:
   - Guards `/dashboard` and `/call/:roomId`.
   - If `loading`, displays clean spinner. If not authenticated, redirects to `/login`.

---

### Phase 2: Presence System (Socket.io & Single-Socket Registry)

#### Objectives
- Establish real-time tracking of online users using a simple single-socket-per-user model.
- Isolate all socket logic into `server/socket/socketHandlers.js`.
- Broadcast live online user lists to all connected clients.

#### Server Architecture: Presence State
- In `server/socket/socketHandlers.js`:
  ```javascript
  // Single-socket-per-user mapping
  const onlineUsers = new Map(); // userId => socketId
  const socketToUser = new Map(); // socketId => userId
  ```

#### Connection, Identification & Disconnection Flow
1. **No Handshake Verification**: Client connects to the Socket.io server without auth tokens in the handshake query or headers.
2. **Client Identification (`user:identify`)**:
   - As soon as the socket connects, the client emits `user:identify` with `{ userId }`.
   - If the user already has an existing socket (e.g. from an earlier tab), the new socket ID simply overwrites the old entry in `onlineUsers`:
     ```javascript
     socket.on('user:identify', ({ userId }) => {
       onlineUsers.set(userId, socket.id);
       socketToUser.set(socket.id, userId);
       // Broadcast updated active user IDs to all clients
       io.emit('presence:update', Array.from(onlineUsers.keys()));
     });
     ```
3. **Disconnection Handling**:
   - When a socket disconnects:
     ```javascript
     socket.on('disconnect', () => {
       const userId = socketToUser.get(socket.id);
       if (userId && onlineUsers.get(userId) === socket.id) {
         onlineUsers.delete(userId);
       }
       socketToUser.delete(socket.id);
       io.emit('presence:update', Array.from(onlineUsers.keys()));
     });
     ```

#### Frontend Presence Consumption
- `SocketContext.jsx` connects upon authentication:
  - On connection, emits `user:identify` with `currentUser._id`.
  - Listens for `presence:update`.
  - Maintains `onlineUsers` list (filtering out `currentUser._id`).
- `Dashboard.jsx`:
  - Renders user card for each online peer with a prominent **"Start Call"** button.

---

### Phase 3: Call Signaling & Daily.co Room Creation Flow

#### Objectives
- Enable a caller to initiate a call to an online recipient.
- Display an incoming call modal to the recipient with simple Accept/Reject options (no auto-timeout).
- On call accept, the server invokes Daily's REST API (`POST https://api.daily.co/v1/rooms`) to generate a unique room URL.
- Distribute the `roomUrl` in the `call:accepted` payload to both caller and callee.
- Synchronize navigation to the active call room upon acceptance.

#### Signaling Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Caller as User A (Caller)
    participant SocketServer as Socket.io Server
    participant DailyAPI as Daily.co REST API
    actor Callee as User B (Callee)

    Caller->>SocketServer: call:invite { recipientId }
    Note over SocketServer: Server resolves Caller's name from DB/session via userId
    SocketServer->>Callee: call:incoming { callId, caller: { id, name } }

    alt Callee Accepts
        Callee->>SocketServer: call:accept { callId, callerId }
        Note over SocketServer: Call Daily REST API to create room
        SocketServer->>DailyAPI: POST /v1/rooms { properties: { exp: in 1 hour } }
        DailyAPI-->>SocketServer: { url: "https://your-domain.daily.co/room-abc" }
        SocketServer->>Caller: call:accepted { callId, roomUrl, callee: { id, name } }
        SocketServer->>Callee: call:accepted { callId, roomUrl }
        Note over Caller,Callee: Both navigate to /call/:callId & join Daily Room
    else Callee Rejects
        Callee->>SocketServer: call:reject { callId, callerId }
        SocketServer->>Caller: call:rejected { callId }
        Note over Caller: Caller sees "Call Declined" toast/alert. UI resets. No DB write.
    end
```

#### Key Signaling Events (`socketHandlers.js`)
- `call:invite`:
  - Caller sends `{ recipientId }`.
  - Server retrieves caller identity (name and ID) using their registered `userId`.
  - Server looks up `recipientId` in `onlineUsers` and forwards `call:incoming { callId, caller: { id, name } }`.
- `call:accept`:
  - Callee sends `{ callId, callerId }`.
  - Server invokes Daily.co REST API (`POST https://api.daily.co/v1/rooms`) with `Authorization: Bearer process.env.DAILY_API_KEY`.
  - Daily returns a ephemeral room object containing `url`.
  - Server emits `call:accepted { callId, roomUrl, callee: { id, name } }` to the caller's socket and `call:accepted { callId, roomUrl }` to the callee's socket.
  - Both peers navigate to `CallRoom.jsx` passing `roomUrl`.
- `call:reject`:
  - Callee sends `{ callId, callerId }`.
  - Server emits `call:rejected { callId }` to caller's socket.
  - Caller dismisses calling UI and displays a "Call Declined" notification.
  - **No database record is created** for rejected calls.

---

### Phase 4: Core Video/Audio Call Engine (Daily.co)

#### Overview
Instead of managing low-level `RTCPeerConnection` instances, SDP offer/answers, and raw ICE candidate queues, video and audio calling is managed via the **Daily.co call object** (`@daily-co/daily-js`). Daily provides a managed Selective Forwarding Unit (SFU) with automated TURN relay fallback, bandwidth management, and streamlined track attachment APIs.

#### Daily Call Architecture Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Peer A (Caller)
    participant DailySFU as Daily.co Managed SFU
    participant Callee as Peer B (Callee)

    Note over Caller,Callee: Both receive roomUrl from call:accepted & mount CallRoom
    Caller->>Caller: DailyIframe.createCallObject()
    Callee->>Callee: DailyIframe.createCallObject()

    Caller->>DailySFU: call.join({ url: roomUrl })
    Callee->>DailySFU: call.join({ url: roomUrl })

    Note over Caller,DailySFU: Daily fires 'track-started' for local camera & microphone
    Caller->>Caller: Attach local track to local <video> element (PIP)
    Callee->>Callee: Attach local track to local <video> element (PIP)

    Note over DailySFU,Caller: Daily fires 'participant-joined' & 'track-started' for remote peer
    DailySFU->>Caller: Remote track-started (video/audio)
    Caller->>Caller: Attach remote track to main <video> element
    DailySFU->>Callee: Remote track-started (video/audio)
    Callee->>Callee: Attach remote track to main <video> element

    Note over Caller,Callee: Media Flowing via Daily SFU! Record startedAt
```

#### Client Hook Implementation Details (`useDailyCall.js`)

##### 1. Persistent Call Object (`useRef`)
To prevent re-creating the Daily call instance on component re-renders, the call object is stored in a React `useRef`:
```javascript
import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

export const useDailyCall = (roomUrl, onCallConnected, onCallEnded) => {
  const dailyRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteParticipant, setRemoteParticipant] = useState(null);

  useEffect(() => {
    if (!roomUrl) return;

    // 1. Create Call Object (headless, customized UI)
    const call = DailyIframe.createCallObject();
    dailyRef.current = call;

    // 2. Event Listeners for Tracks & Participants
    call.on('track-started', (event) => {
      if (event.participant.local) {
        if (event.track.kind === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([event.track]);
        }
      } else {
        if (event.track.kind === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = new MediaStream([event.track]);
        }
        if (onCallConnected) onCallConnected();
      }
    });

    call.on('track-stopped', (event) => {
      if (event.participant.local && event.track.kind === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      } else if (!event.participant.local && event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    call.on('participant-joined', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(event.participant);
      }
    });

    call.on('participant-left', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(null);
        if (onCallEnded) onCallEnded();
      }
    });

    // 3. Join Room
    call.join({ url: roomUrl });

    // 4. Cleanup on Unmount
    return () => {
      call.leave().then(() => call.destroy());
      dailyRef.current = null;
    };
  }, [roomUrl]);

  // 5. Hardware Track Toggles via Daily API
  const toggleAudio = () => {
    if (dailyRef.current) {
      const nextAudio = !isAudioMuted;
      dailyRef.current.setLocalAudio(!nextAudio);
      setIsAudioMuted(nextAudio);
    }
  };

  const toggleVideo = () => {
    if (dailyRef.current) {
      const nextVideo = !isVideoOff;
      dailyRef.current.setLocalVideo(!nextVideo);
      setIsVideoOff(nextVideo);
    }
  };

  const hangUp = async () => {
    if (dailyRef.current) {
      await dailyRef.current.leave();
      dailyRef.current.destroy();
      dailyRef.current = null;
    }
  };

  return {
    localVideoRef,
    remoteVideoRef,
    isAudioMuted,
    isVideoOff,
    remoteParticipant,
    toggleAudio,
    toggleVideo,
    hangUp
  };
};
```

##### 2. Mute/Camera Toggles
- Unlike raw WebRTC where developers manipulate `MediaStreamTrack.enabled` manually, Daily provides high-level convenience methods:
  - `call.setLocalAudio(boolean)`
  - `call.setLocalVideo(boolean)`
- These methods stop sending packets to the SFU when disabled, saving upstream client bandwidth while retaining hardware bindings.

##### 3. Teardown & Lifecycle Cleanup
- When a user clicks "Hang Up":
  1. Call `call.leave()` and `call.destroy()`.
  2. Emit `call:end` via Socket.io to notify the other peer and trigger call summary logging in MongoDB.
  3. Reset video elements' `srcObject = null`.
- When the remote peer closes their tab or leaves:
  1. Daily triggers the `participant-left` event.
  2. The local client triggers `hangUp()` and returns to the Dashboard.

---

### Phase 5: In-Call Ephemeral Text Chat

#### Objectives
- Allow active call participants to send real-time text messages.
- Keep implementation simple and robust via Socket.io call session broadcast.

#### Architectural Details
- **Signaling Event Payload**:
  `chat:message` consistently carries `{ callId, senderId, senderName, text, timestamp }`.
- **Server Behavior**:
  Forwards the `chat:message` payload directly to the other party's socket in the call session.
- **Persistence Limitation**:
  - *Design Choice*: Ephemeral (in-memory on the clients only). Messages exist strictly during the active call session and are discarded upon hanging up.
  - *Known Limitation Documented*: Chat history is deliberately unpersisted in MongoDB to keep the scope strictly lean for 1-to-1 live communications.
- **Frontend Component (`ChatBox.jsx`)**:
  - Embedded alongside `VideoCall.jsx`.
  - Auto-scrolls to newest message using `messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })`.
  - Shows sender name, text, and timestamp formatted cleanly (e.g. `10:42 AM`).

---

### Phase 6: Call History & Logging (MongoDB)

#### Objectives
- Log only calls that **successfully connected** (Daily room joined and remote media established) to MongoDB.
- Display a historical call log table of past connected calls in the user dashboard.

#### Schema (`server/models/Call.js`)
```javascript
const callSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  durationSeconds: { type: Number, required: true }
}, { timestamps: true });
```
*(Note: There is no status enum field. Only connected calls that complete are logged to MongoDB. Declined/rejected calls are never persisted).*

#### Lifecycle Call Logging Triggers
1. **Call Start**: `startedAt` is recorded when the remote participant joins the Daily room and remote media tracks begin.
2. **Call End**: When either peer clicks "Hang Up" or disconnects, the server receives or triggers `call:end`:
   - `endedAt = new Date()`.
   - `durationSeconds = Math.round((endedAt - startedAt) / 1000)`.
   - The Call document is written directly to MongoDB by `socketHandlers.js`.
3. **Rejected Calls**: Produce no database document; caller is notified via the `call:rejected` socket event only.

#### Endpoints
- `GET /api/calls`: Protected REST route. Returns calls where `caller === req.user.id || receiver === req.user.id`, sorted by `startedAt: -1`.
- Populates `caller` and `receiver` with `name` and `email`.

---

## 5. Socket.io Event Protocol Specification

All events are centralized in `server/socket/socketHandlers.js`:

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `user:identify` | Client -> Server | `{ userId }` | Emitted immediately after socket connection to register `userId -> socketId`. |
| `presence:update` | Server -> Clients | `Array<string>` (userIds) | Broadcasts list of all currently active user IDs. |
| `call:invite` | Caller -> Server | `{ recipientId }` | Caller requests call; server looks up caller's name using their registered `userId`. |
| `call:incoming` | Server -> Callee | `{ callId, caller: { id, name } }` | Displays incoming call modal on callee's screen. |
| `call:accept` | Callee -> Server | `{ callId, callerId }` | Callee accepts; server calls Daily REST API to create room. |
| `call:accepted` | Server -> Caller & Callee | `{ callId, roomUrl, callee: { id, name } }` | Transmits generated Daily `roomUrl` to both peers and initiates room transition. |
| `call:reject` | Callee -> Server | `{ callId, callerId }` | Callee declines; informs caller via socket (no DB write). |
| `call:rejected` | Server -> Caller | `{ callId }` | Caller displays "Call Declined" toast/alert and resets UI. |
| `chat:message` | Peer -> Server -> Peer | `{ callId, senderId, senderName, text, timestamp }` | Ephemeral in-call chat message broadcast. |
| `call:end` | Peer -> Server -> Peer | `{ callId }` | Hangs up call, leaves Daily room, calculates duration, and writes Call log to MongoDB. |

---

## 6. Testing & Verification Playbook

### Multi-Tab Local Testing Strategy
1. **Environment Setup**:
   - Terminal 1: MongoDB running locally on `mongodb://127.0.0.1:27017/sonar` (or Atlas URI).
   - Terminal 2: `cd server && npm run dev` (Express & Socket.io on port 5000, with `DAILY_API_KEY` set in `.env`).
   - Terminal 3: `cd client && npm run dev` (Vite dev server on port 5173).
2. **Two Separate Sessions**:
   - Window 1: Standard Chrome window navigated to `http://localhost:5173`. Register/Login user `Alice` (`alice@example.com`).
   - Window 2: Incognito Chrome window navigated to `http://localhost:5173`. Register/Login user `Bob` (`bob@example.com`).
3. **Stage-by-Stage Verification**:
   - **Verification 1 (Presence - Single Socket)**: Confirm Alice sees Bob listed as "Online" on Dashboard, and Bob sees Alice. If Alice opens a second tab, verify the single-socket map updates cleanly without crashing.
   - **Verification 2 (Invite & Reject Flow)**:
     - Alice clicks "Call" next to Bob.
     - Bob sees the incoming call modal with Alice's name and Accept/Reject buttons.
     - Bob clicks "Reject".
     - Verify Alice immediately sees a "Call Declined" notification and her UI returns to normal.
     - Check MongoDB (`db.calls.find()`): verify **no call record** was created.
   - **Verification 3 (Accept & Daily.co Room Connection)**:
     - Alice calls Bob again.
     - Bob clicks "Accept".
     - Server creates a Daily.co room via `POST https://api.daily.co/v1/rooms`.
     - Both peers receive `call:accepted` with the `roomUrl` and navigate to `/call/:callId`.
     - Daily call objects initialize via `DailyIframe.createCallObject()` and join the room (`call.join({ url: roomUrl })`).
   - **Verification 4 (Video/Audio Streams via Daily.co)**:
     - Verify Alice sees her local preview (mirrored PIP) once Daily triggers local `track-started`.
     - Verify Alice sees Bob's remote video feed once Daily triggers remote `track-started`.
     - Verify Bob sees his local preview and Alice's remote feed.
   - **Verification 5 (Mute/Video Toggles via Daily API)**:
     - Alice toggles her microphone. Verify `call.setLocalAudio(false)` is invoked and Bob cannot hear Alice.
     - Alice toggles her camera. Verify `call.setLocalVideo(false)` is invoked and Bob sees Alice's video placeholder/black screen.
   - **Verification 6 (Ephemeral Chat)**:
     - Alice types "Hello Bob!" in the in-call chat. Bob receives it instantly with sender name and timestamp.
     - Bob replies "Hey Alice!". Confirm the chat auto-scrolls to the bottom.
   - **Verification 7 (Teardown & Call History Persistence)**:
     - Alice clicks "Hang Up".
     - Both clients invoke `call.leave()` and `call.destroy()`, turning off camera hardware lights.
     - Both peers return to the Dashboard.
     - Check MongoDB (`db.calls.find()`): verify a single Call record is written with `caller`, `receiver`, `startedAt`, `endedAt`, and calculated `durationSeconds`.
     - Verify the Call History table on both Alice's and Bob's dashboards displays the new completed call entry.
   - **Verification 8 (Unclean Tab Close Mid-Call)**:
     - Start a call between Alice and Bob.
     - Abruptly close Bob's browser window mid-call.
     - Daily triggers `participant-left` on Alice's client, prompting cleanup, ending the call, and returning Alice to the Dashboard.

---

## 7. Technical Interview Preparation & Common Questions

1. **Why use a managed SFU (like Daily.co) instead of raw P2P for a video calling application?**
   - In raw Peer-to-Peer (Mesh), each participant connects directly to every other participant. While simple for 2 peers, raw P2P often fails in real-world networks due to strict corporate NATs/symmetric firewalls (requiring self-hosted TURN relays), and bandwidth scales quadratically if group calls are ever added. A managed SFU (Selective Forwarding Unit) routes media through high-speed edge servers, performs automatic NAT/TURN fallback, adapts video quality to varying client bandwidths, and abstracts complex SDP/ICE state machines into clean event-driven APIs.
2. **What is the architectural trade-off of Daily.co vs. native WebRTC for this project?**
   - **Native WebRTC**: Maximum control over the low-level media pipeline, zero vendor lock-in, and zero third-party service costs. However, it requires extensive boilerplate to handle SDP offer/answer exchange, ICE candidate race conditions, hardware track manipulation, and self-hosted STUN/TURN infrastructure.
   - **Daily.co**: Drastically reduces code complexity (no manual SDP/ICE handling), guarantees enterprise-grade TURN fallback out of the box, and provides built-in media quality optimization. The trade-off is dependency on Daily's cloud service and API rate/usage limits.
3. **What is the role of Socket.io when Daily.co is handling the audio/video media?**
   - There is a clean **separation of concerns**:
     - **Socket.io** manages application-level signaling and presence: knowing which users are logged in, sending call invitations, prompting the accept/reject modal, delivering ephemeral chat messages, and synchronizing call termination.
     - **Daily.co** manages media-level transport: handling camera/microphone capture, encoding, transmitting audio/video packets to the SFU, and rendering media tracks in the browser.
4. **How does Daily.co handle network transitions and NAT/firewall traversal under the hood?**
   - Daily uses a geographically distributed global mesh of media servers. When a client joins, Daily tests network pathways to select the lowest-latency edge server. If UDP is blocked by a restrictive firewall or symmetric NAT, Daily automatically falls back to TLS-wrapped TCP/TURN relays without interrupting the user experience or requiring custom server configuration.

---

## 8. Design System & Mandated Color Stack Tokens (`tailwind.config.js`)

The application must **strictly and exclusively** use the following color token stack for all styling across the application (light and dark themes). All custom earth/warm tokens are mapped into Tailwind CSS via `tailwind.config.js` under `theme.extend.colors`, allowing utility classes to seamlessly access both base and dark mode variants.

### Tailwind Configuration (`client/tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Strategy: binds dark: variants directly to the [data-theme="dark"] attribute on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: {
          DEFAULT: '#FDFBF6',
          dark: '#1C1715',
        },
        surface: {
          DEFAULT: '#F8F5EE',
          dark: '#261F1D',
          2: '#F3EDE3',
          '2-dark': '#332C2A',
          '3-dark': '#3E3735',
        },
        // Borders
        border: {
          DEFAULT: '#E6DBCC',
          dark: '#484240',
          strong: '#D3C5B0',
          'strong-dark': '#5A5250',
        },
        // Typography
        text: {
          DEFAULT: '#261F1D',
          dark: '#F3EEE6',
          2: '#5C5653',
          '2-dark': '#C4BAB0',
          muted: '#6F6863',
          'muted-dark': '#A0958C',
        },
        // Primary (Red / Coral)
        primary: {
          DEFAULT: '#CF3426',
          dark: '#F29188',
          hover: '#AC2B20',
          'hover-dark': '#F5A79F',
          brand: '#D93E30',
          tint: '#F9E4DE',
          'tint-dark': '#47312E',
        },
        'on-primary': {
          DEFAULT: '#FDFBF6',
          dark: '#1C1715',
        },
        // Secondary (Rust / Terracotta)
        secondary: {
          DEFAULT: '#A03401',
          dark: '#E99C72',
          tint: '#F2E3D9',
          'tint-dark': '#48311F',
        },
        'on-secondary': {
          DEFAULT: '#FDFBF6',
          dark: '#1C1715',
        },
        // Accent (Orange)
        accent: {
          DEFAULT: '#E87721',
          dark: '#FA8F2C',
          hi: '#FA8F2C',
          soft: '#E87721',
          tint: '#FDEEDE',
          'tint-dark': '#48311F',
        },
        'on-accent': {
          DEFAULT: '#261F1D',
          dark: '#1C1715',
        },
        // Earthy supporting
        bronze: {
          DEFAULT: '#8C5D23',
          dark: '#CD9652',
          tint: '#EFE8DD',
          'tint-dark': '#413225',
        },
        brown: {
          DEFAULT: '#825F45',
          dark: '#B59882',
        },
        sage: {
          DEFAULT: '#636650',
          dark: '#9B9D8E',
          fill: '#797D62',
          tint: '#EDECE4',
          'tint-dark': '#39332F',
        },
        'rust-fill': '#A03401',
        salmon: '#F29188',
        peach: '#E99C72',
        tan: '#D08C60',
        // Semantic states
        success: {
          DEFAULT: '#636650',
          dark: '#9B9D8E',
          tint: '#EDECE4',
          'tint-dark': '#39332F',
        },
        warning: {
          DEFAULT: '#8C5D23',
          dark: '#FA8F2C',
          fill: '#E87721',
          tint: '#FDEEDE',
          'tint-dark': '#48311F',
        },
        danger: {
          DEFAULT: '#CF3426',
          dark: '#EF6B5E',
          tint: '#F9E4DE',
          'tint-dark': '#47312E',
        },
        info: {
          DEFAULT: '#825F45',
          dark: '#B59882',
          tint: '#EFE8DD',
          'tint-dark': '#413225',
        },
        // Misc & Focus
        'focus-ring': {
          DEFAULT: '#A03401',
          dark: '#FA8F2C',
        },
        overlay: {
          DEFAULT: 'rgba(38,31,29,0.5)',
          dark: 'rgba(0,0,0,0.6)',
        },
        // Auth Brand Panel (dark in both light & dark app themes)
        panel: {
          DEFAULT: '#261F1D',
          text: '#FDFBF6',
          'text-2': '#C4BAB0',
          accent: '#FA8F2C',
        },
      },
      boxShadow: {
        'sonar-light': '0 1px 2px rgba(38,31,29,.06), 0 4px 16px rgba(38,31,29,.06)',
        'sonar-dark': '0 0 0 1px rgba(253,251,246,.06)',
      },
    },
  },
  plugins: [],
};
```

### PostCSS Configuration (`client/postcss.config.js`)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Client Global Directives (`client/src/index.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg text-text transition-colors duration-150;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

### Theming Strategy (`data-theme="dark"`)
By specifying `darkMode: ['selector', '[data-theme="dark"]']`, Tailwind's `dark:` modifier automatically activates whenever an ancestor element has the `data-theme="dark"` attribute (e.g. `<html data-theme="dark">` or `<div data-theme="dark">`). In React, toggling theme simply updates the root attribute:
```javascript
document.documentElement.setAttribute('data-theme', theme); // 'light' or 'dark'
```

---

### Component Token Mapping Guide (Tailwind Utility Classes)

- **Backgrounds & Viewport**:
  - Full-screen App Viewport: `className="min-h-screen bg-bg dark:bg-bg-dark text-text dark:text-text-dark"`
  - Cards & Content Containers: `className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl shadow-sonar-light dark:shadow-sonar-dark p-6"`
  - Hover States / Secondary Containers: `className="bg-surface-2 dark:bg-surface-2-dark hover:bg-surface dark:hover:bg-surface-3-dark transition-colors"`
- **Typography**:
  - Primary Headings & Usernames: `className="text-text dark:text-text-dark font-bold text-xl"`
  - Subheadings & Secondary Labels: `className="text-text-2 dark:text-text-2-dark text-sm font-medium"`
  - Timestamps, Metadata, Captions: `className="text-text-muted dark:text-text-muted-dark text-xs"`
- **Action Buttons & Status Badges**:
  - Primary Call-to-Action ("Start Call", "Accept"): `className="bg-primary hover:bg-primary-hover dark:bg-primary-dark dark:hover:bg-primary-hover-dark text-on-primary dark:text-on-primary-dark font-semibold px-4 py-2 rounded-lg transition-colors"`
  - Hang Up / Destructive Action: `className="bg-danger hover:bg-primary-hover dark:bg-danger-dark text-on-primary dark:text-on-primary-dark font-semibold px-4 py-2 rounded-lg transition-colors"`
  - Secondary Actions / Mute Controls (Normal): `className="bg-surface-2 dark:bg-surface-2-dark text-text dark:text-text-dark border border-border dark:border-border-dark p-3 rounded-full hover:bg-surface dark:hover:bg-surface-3-dark transition-colors"`
  - Active Toggle State (Mic Muted / Camera Off): `className="bg-accent-tint dark:bg-accent-tint-dark text-accent dark:text-accent-dark border border-accent dark:border-accent-dark p-3 rounded-full transition-colors"`
  - Online User Status Badge: `className="bg-success-tint dark:bg-success-tint-dark text-success dark:text-success-dark text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center"`
- **Modals & Overlays**:
  - Backdrop Modal Overlay: `className="fixed inset-0 bg-overlay dark:bg-overlay-dark backdrop-blur-sm z-50 flex items-center justify-center p-4"`
  - Form Focus Rings: `className="focus:outline-none focus:ring-2 focus:ring-focus-ring dark:focus:ring-focus-ring-dark"`
- **Authentication Pages (Login/Register)**:
  - Left Brand Showcase Panel (stays dark in both light & dark themes): `className="bg-panel text-panel-text p-10 flex flex-col justify-between"`
  - Left Panel Subtitle: `className="text-panel-text-2 text-sm"`
  - Left Panel Accent Highlight: `className="text-panel-accent font-bold"`

> [!NOTE]
> **Styling Architecture Flag**: Any UI component descriptions throughout this document (e.g., `IncomingCallModal.jsx`, `ChatBox.jsx`, `VideoCall.jsx` layout, `Navbar.jsx`, `Dashboard.jsx`) that previously referenced inline CSS custom properties or vanilla CSS styles are to be understood and implemented strictly using the Tailwind utility classes specified in the Component Token Mapping Guide above.
