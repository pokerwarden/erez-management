import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string
    if (userId) {
      socket.join(`user:${userId}`)
    }

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io rooms
    })
  })

  return io
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export function emitToAll(event: string, data: unknown) {
  getIO().emit(event, data)
}

export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data)
}
