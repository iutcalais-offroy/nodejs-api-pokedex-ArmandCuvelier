import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { authRouter } from './auth/route/auth.route'
import { cardsRouter } from './cards/cards.route'
import deckRouter from './decks/decks.route'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocument } from './docs'

// Create Express app
export const app = express()
const PORT = process.env.PORT || 3000

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

// Start server only if this file is run directly (not imported for the tests)
if (require.main === module) {
  // Create HTTP server
  const httpServer = createServer(app)

  // Start server
  try {
    httpServer.listen(PORT, () => {
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
