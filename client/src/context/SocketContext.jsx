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

    // Connect to server — no auth token in handshake (intentional, see IMPLEMENTATION.md)
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Immediately identify to register userId → socketId on server
      socket.emit('user:identify', { userId: user._id });
    });

    // Phase 2: receive updated presence list from server
    socket.on('presence:update', (userIds) => {
      setOnlineUserIds(userIds.filter((id) => id !== user._id));
    });

    // Phase 3: receive incoming call invite
    socket.on('call:incoming', (payload) => {
      setIncomingCall(payload);
    });

    // When call is rejected, clear any stale incoming state for callee side
    socket.on('call:rejected', () => {
      setIncomingCall(null);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [isAuthenticated, user]);

  const clearIncomingCall = useCallback(() => setIncomingCall(null), []);

  return (
    <SocketContext.Provider
      value={{ socket: socketInstance, socketRef, onlineUserIds, incomingCall, clearIncomingCall }}
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
