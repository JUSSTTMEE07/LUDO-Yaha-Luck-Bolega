/**
 * socket.js – Socket.IO Client Singleton
 * Import this anywhere in the app. Connection is deferred until socket.connect() is called.
 */
import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:3001` 
    : 'http://localhost:3001');

const socket = io(BACKEND_URL, {
  autoConnect: false,        // manual connect after auth
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
})

export default socket
