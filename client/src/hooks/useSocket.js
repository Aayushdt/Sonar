import { useSocket } from '../context/SocketContext';

/**
 * useSocket hook — thin convenience wrapper that exposes the socket instance
 * and the socketRef from SocketContext for use inside components.
 */
const useSocketHook = () => {
  const { socket, socketRef, onlineUserIds, incomingCall, clearIncomingCall } = useSocket();
  return { socket, socketRef, onlineUserIds, incomingCall, clearIncomingCall };
};

export default useSocketHook;
