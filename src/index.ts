import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import * as http from 'node:http'
import { authRouter } from './auth/route/auth.route'
import { cardsRouter } from './cards/cards.route'
import deckRouter from './decks/decks.route'
import { decksService } from './decks/decks.service'
import { deckCardsService } from './deckCards/deckCards.service'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocument } from './docs'
import { socketAuthMiddleware } from './socket/socket.middleware'

// Create Express app
export const app = express()
const PORT = process.env.PORT || 3000

//server
const server = http.createServer(app)

//Socket io
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/', cardsRouter)
app.use('/api/', deckRouter)

//Midleware
io.use(socketAuthMiddleware)

//rooms
const rooms = new Map<
  number,
  { hostId: number; username: string; players: number }
>()

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  //Exigences de données présentes dans le socket après authentification
  //console.log(socket.data.userId)
  //console.log(socket.data.email)
  console.log("Un client s'est connecté:", socket.id)
  socket.on('disconnect', () => {
    console.log("Un client s'est déconnecté:", socket.id)
  })

  //Evenement de creation de room
  socket.on('createRoom', async (data) => {
    //get the deck if exist
    const deck_id = parseInt(data.deckId)
    try {
      await decksService.read(socket.data.userId, deck_id)
    } catch {
      socket.emit('error', { message: 'deck inexistant' })
      return
    }

    //check if the deck is valid
    const valid = await deckCardsService.nb_cards_decks(deck_id)
    if (!valid) {
      socket.emit('error', { message: 'deck non valide' })
      return
    }

    //création room
    rooms.set(deck_id, {
      hostId: socket.data.userId,
      username: socket.data.username,
      players: 1,
    })
    socket.join(`${deck_id}`)

    //envoies des évènements
    socket.emit('roomCreated', { roomId: deck_id })
    io.emit('roomsListUpdated', { rooms: [...rooms.entries()] })
  })

  //évènement de getRooms
  socket.on('getRooms', () => {
    const available = Object.fromEntries(
      [...rooms.entries()].filter(([, info]) => info.players < 2),
    )
    socket.emit('roomsList', available)
  })

  //évènement de joinRoom
  socket.on('joinRoom', async (data) => {
    const room_id = parseInt(data.roomId)
    const deck_id = parseInt(data.deckId)

    // Vérifier que la room existe
    const room = rooms.get(room_id)
    if (!room) {
      socket.emit('error', { message: 'Room inexistante' })
      return
    }

    // Vérifier que la room n'est pas complète
    if (room.players >= 2) {
      socket.emit('error', { message: 'Room déjà complète' })
      return
    }

    // Vérifier le deck
    try {
      await decksService.read(socket.data.userId, deck_id)
    } catch {
      socket.emit('error', { message: 'Deck inexistant' })
      return
    }

    const valid = await deckCardsService.nb_cards_decks(deck_id)
    if (!valid) {
      socket.emit('error', { message: 'Deck non valide' })
      return
    }

    // Rejoindre la room
    socket.join(`${room_id}`)
    room.players++

    // Démarrer la partie
    const gameState = { roomId: room_id, status: 'started' }

    // Envoyer à chaque joueur son état
    socket.emit('gameStarted', {
      ...gameState,
      you: socket.data.userId,
      opponent: room.hostId,
    })
    socket.to(`${room_id}`).emit('gameStarted', {
      ...gameState,
      you: room.hostId,
      opponent: socket.data.userId,
    })

    // Retirer la room de la liste
    rooms.delete(room_id)
    io.emit('roomsListUpdated', { rooms: Object.fromEntries(rooms) })
  })
})

// Start server only if this file is run directly (not imported for the tests)
if (require.main === module) {
  // Start server
  try {
    server.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`)
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
