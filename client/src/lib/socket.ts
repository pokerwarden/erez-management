import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function initSocket(userId: string): Socket {
  if (socket?.connected) return socket

  socket = io('/', {
    query: { userId },
    withCredentials: true,
  })

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
