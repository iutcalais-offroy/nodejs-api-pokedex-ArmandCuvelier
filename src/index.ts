import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import * as http from 'node:http'
import { authRouter } from './auth/route/auth.route'
import { cardsRouter } from './cards/cards.route'
import deckRouter from './decks/decks.route'
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

// Écoute des connexions Socket.IO
io.on('connection', (socket) => {
  //Exigences de données présentes dans le socket après authentification
  //console.log(socket.data.userId)
  //console.log(socket.data.email)
  console.log("Un client s'est connecté:", socket.id)
  socket.on('disconnect', () => {
    console.log("Un client s'est déconnecté:", socket.id)
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
