/**
 * socketHandlers.js
 * Single source of truth for ALL Socket.io event logic.
 * Handles: presence, call invite/accept/reject, chat messages, call termination,
 *          Daily.co room creation via REST API, and MongoDB call logging.
 */

import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import User from '../models/User.js';
import Call from '../models/Call.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory presence state (single-socket-per-user model)
// ─────────────────────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId  => socketId
const socketToUser = new Map(); // socketId => userId

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// In-memory active call sessions
// callId => { callerId, calleeId, startedAt }
// ─────────────────────────────────────────────────────────────────────────────
const activeCalls = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// In-memory pending call invitations
// callId => { timeoutId, callerId, recipientId, createdAt }
// ─────────────────────────────────────────────────────────────────────────────
const pendingInvites = new Map();
const INVITE_TIMEOUT_MS = 30000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a Daily.co room via their REST API
// Returns the room URL string on success, throws on error.
// ─────────────────────────────────────────────────────────────────────────────
const createDailyRoom = async () => {
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        // Room expires 1 hour from now
        exp: Math.floor(Date.now() / 1000) + 3600,
        max_participants: 10,
        enable_chat: false, // We handle ephemeral chat via Socket.io
        enable_screenshare: true,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Daily.co room creation failed: ${err}`);
  }

  const data = await response.json();
  return data.url; // e.g. "https://your-domain.daily.co/room-abc"
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: return serialised online user list for broadcasting
// ─────────────────────────────────────────────────────────────────────────────
const getOnlineUserIds = () => Array.from(onlineUsers.keys());

// ─────────────────────────────────────────────────────────────────────────────
// Main export: receives io and attaches all handlers
// ─────────────────────────────────────────────────────────────────────────────
const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 2: Presence — user:identify
    // Client emits immediately after connect with their userId (from REST auth).
    // New tab overwrites old socket entry (single-socket-per-user model).
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('user:identify', async ({ userId }) => {
      if (!userId) return;

      // Overwrite any previous socket mapping for this user
      onlineUsers.set(userId, socket.id);
      socketToUser.set(socket.id, userId);

      console.log(`[Presence] User ${userId} identified as socket ${socket.id}`);

      // Broadcast updated presence to ALL connected clients
      io.emit('presence:update', getOnlineUserIds());
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 3: Call signaling — call:invite
    // Caller sends { recipientId }.
    // Server sets 30s timeout, resolves caller name from DB, forwards call:incoming.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:invite', async ({ recipientId }) => {
      const callerId = socketToUser.get(socket.id);
      if (!callerId) return;

      const recipientSocketId = onlineUsers.get(recipientId);
      if (!recipientSocketId) {
        // Recipient went offline since the caller last saw them
        socket.emit('call:error', { message: 'User is no longer online.' });
        return;
      }

      try {
        // Look up caller name from DB (trust DB, not client-supplied data)
        const callerUser = await User.findById(callerId).select('name');
        if (!callerUser) return;

        const callId = uuidv4();
        const createdAt = new Date();

        // Setup 30s invite timeout — emits call:missed if no response
        const timeoutId = setTimeout(async () => {
          pendingInvites.delete(callId);

          const curCallerSocket = onlineUsers.get(callerId);
          const curRecipientSocket = onlineUsers.get(recipientId);

          if (curCallerSocket) {
            io.to(curCallerSocket).emit('call:missed', { callId, reason: 'timeout' });
          }
          if (curRecipientSocket) {
            io.to(curRecipientSocket).emit('call:missed', { callId, reason: 'timeout' });
          }

          try {
            await Call.create({
              caller: callerId,
              receiver: recipientId,
              startedAt: createdAt,
              endedAt: new Date(),
              durationSeconds: 0,
              status: 'missed',
            });
            console.log(`[Call] 30s timeout elapsed: marked as missed | callId: ${callId}`);
          } catch (err) {
            console.error('[call:invite timeout log]', err);
          }
        }, INVITE_TIMEOUT_MS);

        pendingInvites.set(callId, {
          callId,
          callerId,
          recipientId,
          timeoutId,
          createdAt,
        });

        // Forward incoming call notification to callee
        io.to(recipientSocketId).emit('call:incoming', {
          callId,
          caller: { id: callerId, name: callerUser.name },
        });

        console.log(`[Call] Invite: ${callerUser.name} (${callerId}) → ${recipientId} | callId: ${callId} (30s timer active)`);
      } catch (err) {
        console.error('[call:invite]', err);
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Caller cancels invitation before acceptance
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:cancel', ({ callId, recipientId }) => {
      const pending = pendingInvites.get(callId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingInvites.delete(callId);
      }
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:cancelled', { callId });
      }
      console.log(`[Call] Invitation cancelled by caller | callId: ${callId}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 3: Call signaling — call:accept
    // Callee sends { callId, callerId }.
    // Clears invite timeout, creates Daily room, emits call:accepted to both.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:accept', async ({ callId, callerId }) => {
      const calleeId = socketToUser.get(socket.id);
      if (!calleeId) return;

      // Clear any pending 30s invite timeout
      const pending = pendingInvites.get(callId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingInvites.delete(callId);
      }

      const callerSocketId = onlineUsers.get(callerId);
      if (!callerSocketId) {
        socket.emit('call:error', { message: 'Caller is no longer online.' });
        return;
      }

      try {
        const calleeUser = await User.findById(calleeId).select('name');
        if (!calleeUser) return;

        // Create Daily.co room
        const roomUrl = await createDailyRoom();

        // Store active call session for later call:end logging
        activeCalls.set(callId, {
          callerId,
          calleeId,
          startedAt: null, // will be set when remote media connects
          roomUrl,
        });

        // Notify caller with roomUrl + callee info
        io.to(callerSocketId).emit('call:accepted', {
          callId,
          roomUrl,
          callee: { id: calleeId, name: calleeUser.name },
        });

        // Notify callee with roomUrl
        socket.emit('call:accepted', {
          callId,
          roomUrl,
        });

        console.log(`[Call] Accepted | callId: ${callId} | Room: ${roomUrl}`);
      } catch (err) {
        console.error('[call:accept]', err);
        const errMsg = 'Failed to create video room. Please ensure DAILY_API_KEY is configured in server/.env.';
        socket.emit('call:error', { message: errMsg });
        if (callerSocketId) {
          io.to(callerSocketId).emit('call:error', { message: errMsg });
        }
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 3: Call signaling — call:reject
    // Callee declines. Clears timeout and notifies caller.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:reject', async ({ callId, callerId }) => {
      const pending = pendingInvites.get(callId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingInvites.delete(callId);
      }

      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:rejected', { callId });
      }

      const calleeId = socketToUser.get(socket.id);
      if (callerId && calleeId) {
        try {
          await Call.create({
            caller: callerId,
            receiver: calleeId,
            startedAt: new Date(),
            endedAt: new Date(),
            durationSeconds: 0,
            status: 'rejected',
          });
        } catch (err) {
          console.error('[call:reject log]', err);
        }
      }

      console.log(`[Call] Rejected | callId: ${callId}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 4 / PHASE 6: call:started
    // Emitted by the client when the remote participant joins and media flows.
    // Records startedAt for this call session.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:started', ({ callId }) => {
      const session = activeCalls.get(callId);
      if (session && !session.startedAt) {
        session.startedAt = new Date();
        activeCalls.set(callId, session);
        console.log(`[Call] Started (media flowing) | callId: ${callId}`);
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 5: Ephemeral in-call chat — chat:message, typing & read receipts
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('chat:message', ({ callId, senderId, senderName, text, timestamp }) => {
      const session = activeCalls.get(callId);
      if (!session) return;

      const userId = socketToUser.get(socket.id);
      const peerId = userId === session.callerId ? session.calleeId : session.callerId;
      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit('chat:message', {
          callId,
          senderId,
          senderName,
          text,
          timestamp,
        });
      }
    });

    // Typing indicators
    socket.on('chat:typing', ({ callId, senderName }) => {
      const session = activeCalls.get(callId);
      if (!session) return;

      const userId = socketToUser.get(socket.id);
      const peerId = userId === session.callerId ? session.calleeId : session.callerId;
      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit('chat:typing', { callId, senderId: userId, senderName });
      }
    });

    socket.on('chat:stop-typing', ({ callId }) => {
      const session = activeCalls.get(callId);
      if (!session) return;

      const userId = socketToUser.get(socket.id);
      const peerId = userId === session.callerId ? session.calleeId : session.callerId;
      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit('chat:stop-typing', { callId, senderId: userId });
      }
    });

    // Read receipt
    socket.on('chat:read', ({ callId, messageTimestamp }) => {
      const session = activeCalls.get(callId);
      if (!session) return;

      const userId = socketToUser.get(socket.id);
      const peerId = userId === session.callerId ? session.calleeId : session.callerId;
      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit('chat:read', { callId, messageTimestamp, readerId: userId });
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 6: Call termination & logging — call:end
    // Emitted by either peer when they hang up or detect peer disconnect.
    // Writes Call document to MongoDB with duration, then notifies peer.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('call:end', async ({ callId }) => {
      const session = activeCalls.get(callId);
      if (!session) return;

      activeCalls.delete(callId);

      const endedAt = new Date();
      const userId = socketToUser.get(socket.id);

      // Determine the other peer and notify them to clean up
      const peerId = userId === session.callerId ? session.calleeId : session.callerId;
      const peerSocketId = onlineUsers.get(peerId);
      if (peerSocketId) {
        io.to(peerSocketId).emit('call:end', { callId });
      }

      // Only log if the call actually connected (startedAt was set)
      if (!session.startedAt) {
        console.log(`[Call] Ended before media connected. No DB record. | callId: ${callId}`);
        return;
      }

      const durationSeconds = Math.max(
        0,
        Math.round((endedAt - session.startedAt) / 1000)
      );

      try {
        await Call.create({
          caller: session.callerId,
          receiver: session.calleeId,
          startedAt: session.startedAt,
          endedAt,
          durationSeconds,
        });
        console.log(`[Call] Logged | callId: ${callId} | duration: ${durationSeconds}s`);
      } catch (err) {
        console.error('[call:end] Failed to write call log:', err);
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Presence: disconnect handling
    // Cleans up socket mappings and broadcasts updated presence list.
    // Also ends any active call the disconnecting user was part of.
    // ──────────────────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userId = socketToUser.get(socket.id);

      if (userId) {
        // Only delete presence if this is still the registered socket (not overwritten by a new tab)
        if (onlineUsers.get(userId) === socket.id) {
          onlineUsers.delete(userId);

          // Find and end any active call this user is part of
          for (const [callId, session] of activeCalls.entries()) {
            if (session.callerId === userId || session.calleeId === userId) {
              activeCalls.delete(callId);

              const peerId =
                session.callerId === userId ? session.calleeId : session.callerId;
              const peerSocketId = onlineUsers.get(peerId);
              if (peerSocketId) {
                io.to(peerSocketId).emit('call:end', { callId });
              }

              // Log the call if it had started
              if (session.startedAt) {
                const endedAt = new Date();
                const durationSeconds = Math.max(
                  0,
                  Math.round((endedAt - session.startedAt) / 1000)
                );
                try {
                  await Call.create({
                    caller: session.callerId,
                    receiver: session.calleeId,
                    startedAt: session.startedAt,
                    endedAt,
                    durationSeconds,
                  });
                  console.log(`[Call] Logged on disconnect | callId: ${callId} | duration: ${durationSeconds}s`);
                } catch (err) {
                  console.error('[disconnect call log]', err);
                }
              }

              break;
            }
          }
        }

        // Clean up any pending invites involving this user
        for (const [callId, invite] of pendingInvites.entries()) {
          if (invite.callerId === userId || invite.recipientId === userId) {
            clearTimeout(invite.timeoutId);
            pendingInvites.delete(callId);
            const otherId = invite.callerId === userId ? invite.recipientId : invite.callerId;
            const otherSocketId = onlineUsers.get(otherId);
            if (otherSocketId) {
              io.to(otherSocketId).emit('call:missed', { callId, reason: 'disconnect' });
            }
          }
        }

        socketToUser.delete(socket.id);
        io.emit('presence:update', getOnlineUserIds());
        console.log(`[Presence] User ${userId} disconnected. Socket: ${socket.id}`);
      }
    });
  });
};

export default initSocketHandlers;
