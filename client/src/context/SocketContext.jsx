import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  // Incoming call state lifted here so IncomingCallModal can consume it globally
  const [incomingCall, setIncomingCall] = useState(null); // { callId, caller: { id, name } }

  // Notification toast state for missed/cancelled/rejected calls
  const [callNotification, setCallNotification] = useState(null);

  // Request browser notification permission once user is active
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketInstance(null);
      setOnlineUserIds([]);
      return;
    }

    // Connect to server
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const socket = io(serverUrl, { transports: ['websocket'] });
    socketRef.current = socket;
    setSocketInstance(socket);

    const identify = () => {
      console.log('[Socket] Identifying user on connect/reconnect:', user._id);
      socket.emit('user:identify', { userId: user._id });
    };

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      identify();
    });

    // Re-emit user:identify on Socket.io reconnect event to prevent stale presence
    socket.io.on('reconnect', () => {
      console.log('[Socket] Reconnected — re-identifying user...');
      identify();
    });

    // Phase 2: receive updated presence list from server
    socket.on('presence:update', (userIds) => {
      setOnlineUserIds(userIds.filter((id) => id !== user._id));
    });

    // Phase 3: receive incoming call invite
    socket.on('call:incoming', (payload) => {
      setIncomingCall(payload);

      // Trigger browser notification if tab is blurred/backgrounded
      if ('Notification' in window && Notification.permission === 'granted') {
        if (document.hidden || !document.hasFocus()) {
          try {
            const notif = new Notification(`Sonar // Incoming Transmission`, {
              body: `${payload.caller?.name || 'A user'} is calling you. Click to respond.`,
              icon: '/favicon.svg',
              tag: `call-${payload.callId}`,
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (e) {
            console.warn('[Notification] Could not trigger desktop alert:', e);
          }
        }
      }
    });

    // When call is rejected, clear incoming state
    socket.on('call:rejected', () => {
      setIncomingCall(null);
      setCallNotification({ type: 'rejected', message: 'Call was declined.' });
      setTimeout(() => setCallNotification(null), 5000);
    });

    // When call is missed (30s timeout elapsed)
    socket.on('call:missed', () => {
      setIncomingCall(null);
      setCallNotification({ type: 'missed', message: 'Transmission timed out / Call missed.' });
      setTimeout(() => setCallNotification(null), 6000);
    });

    // When caller cancels before acceptance
    socket.on('call:cancelled', () => {
      setIncomingCall(null);
      setCallNotification({ type: 'cancelled', message: 'Caller cancelled the invitation.' });
      setTimeout(() => setCallNotification(null), 5000);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [isAuthenticated, user]);

  const clearIncomingCall = useCallback(() => setIncomingCall(null), []);
  const dismissCallNotification = useCallback(() => setCallNotification(null), []);

  const cancelCall = useCallback((callId, recipientId) => {
    if (socketRef.current) {
      socketRef.current.emit('call:cancel', { callId, recipientId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketInstance,
        socketRef,
        onlineUserIds,
        incomingCall,
        clearIncomingCall,
        callNotification,
        dismissCallNotification,
        cancelCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
