import express from 'express'
import { prisma } from './database'
import { calculateDamage } from './utils/rules.util'
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
  { hostId: number; hostDeckId: number; username: string; players: number }
>()

//games info
const games = new Map<
  number,
  {
    player1: {
      id: number
      deckId: number
      hand: number[]
      activeCard: number | null
      activeCardHp: number
      score: number
    }
    player2: {
      id: number
      deckId: number
      hand: number[]
      activeCard: number | null
      activeCardHp: number
      score: number
    }
    currentTurn: number
  }
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
      hostDeckId: deck_id,
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
    games.set(room_id, {
      player1: {
        id: room.hostId,
        deckId: room.hostDeckId,
        hand: [],
        activeCard: null,
        activeCardHp: 0,
        score: 0,
      },
      player2: {
        id: socket.data.userId,
        deckId: deck_id,
        hand: [],
        activeCard: null,
        activeCardHp: 0,
        score: 0,
      },
      currentTurn: room.hostId,
    })

    // Envoyer à chaque joueur son état
    socket.emit('gameStarted', {
      ...gameState,
      id: socket.data.userId,
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

  //évènement drawCards
  socket.on('drawCards', async (data) => {
    const room_id = parseInt(data.roomId)
    const game = games.get(room_id)

    if (!game) {
      socket.emit('error', { message: 'Partie inexistante' })
      return
    }

    // Vérifier que c'est le tour du joueur
    if (game.currentTurn !== socket.data.userId) {
      socket.emit('error', { message: "Ce n'est pas ton tour" })
      return
    }

    // Déterminer le joueur et l'adversaire
    const isPlayer1 = game.player1.id === socket.data.userId
    const player = isPlayer1 ? game.player1 : game.player2
    const opponent = isPlayer1 ? game.player2 : game.player1

    // Piocher jusqu'à 5 cartes
    if (player.hand.length >= 5) {
      socket.emit('error', { message: 'Tu as déjà 5 cartes en main' })
      return
    }

    const allCards = await deckCardsService.getCardsByDeck(player.deckId)
    const remaining = allCards.filter((id) => !player.hand.includes(id))
    const toDraw = 5 - player.hand.length
    const drawn = remaining.slice(0, toDraw)
    player.hand.push(...drawn)

    // Vue adaptée pour chaque joueur
    const Vue = (forPlayer: typeof player, forOpponent: typeof opponent) => ({
      myHand: forPlayer.hand,
      opponentHandCount: forOpponent.hand.length,
      currentTurn: game.currentTurn,
    })

    socket.emit('gameStateUpdated', Vue(player, opponent))
    socket.to(`${room_id}`).emit('gameStateUpdated', Vue(opponent, player))
  })

  //évènement playCards
  socket.on('playCard', async (data) => {
    const room_id = parseInt(data.roomId)
    const game = games.get(room_id)

    if (!game) {
      socket.emit('error', { message: 'Partie inexistante' })
      return
    }

    if (game.currentTurn !== socket.data.userId) {
      socket.emit('error', { message: "Ce n'est pas ton tour" })
      return
    }

    const isPlayer1 = game.player1.id === socket.data.userId
    const player = isPlayer1 ? game.player1 : game.player2
    const opponent = isPlayer1 ? game.player2 : game.player1

    const cardIndex = parseInt(data.cardIndex)
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      socket.emit('error', { message: 'Index de carte invalide' })
      return
    }

    player.activeCard = player.hand.splice(cardIndex, 1)[0]
    const cardData = await prisma.card.findUnique({
      where: { id: player.activeCard },
    })
    player.activeCardHp = cardData?.hp ?? 0

    const Vue = (forPlayer: typeof player, forOpponent: typeof opponent) => ({
      myHand: forPlayer.hand,
      myActiveCard: forPlayer.activeCard,
      opponentActiveCard: forOpponent.activeCard,
      opponentHandCount: forOpponent.hand.length,
      currentTurn: game.currentTurn,
    })

    socket.emit('gameStateUpdated', Vue(player, opponent))
    socket.to(`${room_id}`).emit('gameStateUpdated', Vue(opponent, player))
  })

  //évènement attack
  socket.on('attack', async (data) => {
    const room_id = parseInt(data.roomId)
    const game = games.get(room_id)

    if (!game) {
      socket.emit('error', { message: 'Partie inexistante' })
      return
    }

    if (game.currentTurn !== socket.data.userId) {
      socket.emit('error', { message: "Ce n'est pas ton tour" })
      return
    }

    const isPlayer1 = game.player1.id === socket.data.userId
    const player = isPlayer1 ? game.player1 : game.player2
    const opponent = isPlayer1 ? game.player2 : game.player1

    if (!player.activeCard) {
      socket.emit('error', { message: "Tu n'as pas de carte active" })
      return
    }

    if (!opponent.activeCard) {
      socket.emit('error', { message: "L'adversaire n'a pas de carte active" })
      return
    }

    // Récupérer les infos des cartes
    const attackerCard = await prisma.card.findUnique({
      where: { id: player.activeCard },
    })
    const defenderCard = await prisma.card.findUnique({
      where: { id: opponent.activeCard },
    })

    if (!attackerCard || !defenderCard) {
      socket.emit('error', { message: 'Carte introuvable' })
      return
    }

    // Calculer les dégâts
    const damage = calculateDamage(
      attackerCard.attack,
      attackerCard.type,
      defenderCard.type,
    )
    opponent.activeCardHp -= damage

    // Carte KO
    if (opponent.activeCardHp <= 0) {
      player.score++
      opponent.activeCard = null
      opponent.activeCardHp = 0

      // Victoire
      if (player.score >= 3) {
        const endView = (
          forPlayer: typeof player,
          forOpponent: typeof opponent,
        ) => ({
          winner: forPlayer.id === socket.data.userId ? 'you' : 'opponent',
          yourScore: forPlayer.score,
          opponentScore: forOpponent.score,
        })
        socket.emit('gameEnded', endView(player, opponent))
        socket.to(`${room_id}`).emit('gameEnded', endView(opponent, player))
        games.delete(room_id)
        return
      }
    }

    // Changer de tour
    game.currentTurn = opponent.id

    const Vue = (forPlayer: typeof player, forOpponent: typeof opponent) => ({
      myHand: forPlayer.hand,
      myActiveCard: forPlayer.activeCard,
      myActiveCardHp: forPlayer.activeCardHp,
      myScore: forPlayer.score,
      opponentActiveCard: forOpponent.activeCard,
      opponentActiveCardHp: forOpponent.activeCardHp,
      opponentHandCount: forOpponent.hand.length,
      opponentScore: forOpponent.score,
      currentTurn: game.currentTurn,
    })

    socket.emit('gameStateUpdated', Vue(player, opponent))
    socket.to(`${room_id}`).emit('gameStateUpdated', Vue(opponent, player))
  })

  //évènement endTurn
  socket.on('endTurn', (data) => {
    const room_id = parseInt(data.roomId)
    const game = games.get(room_id)

    if (!game) {
      socket.emit('error', { message: 'Partie inexistante' })
      return
    }

    if (game.currentTurn !== socket.data.userId) {
      socket.emit('error', { message: "Ce n'est pas ton tour" })
      return
    }

    const isPlayer1 = game.player1.id === socket.data.userId
    const player = isPlayer1 ? game.player1 : game.player2
    const opponent = isPlayer1 ? game.player2 : game.player1

    game.currentTurn = opponent.id

    const Vue = (forPlayer: typeof player, forOpponent: typeof opponent) => ({
      myHand: forPlayer.hand,
      myActiveCard: forPlayer.activeCard,
      opponentActiveCard: forOpponent.activeCard,
      opponentHandCount: forOpponent.hand.length,
      currentTurn: game.currentTurn,
      isMyTurn: forPlayer.id === game.currentTurn,
    })

    socket.emit('gameStateUpdated', Vue(player, opponent))
    socket.to(`${room_id}`).emit('gameStateUpdated', Vue(opponent, player))
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
