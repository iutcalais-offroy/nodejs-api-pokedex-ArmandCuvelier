import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import 'dotenv/config'

/**
 * Middleware d'authentification JWT pour Socket.IO.
 *
 * Vérifie la présence et la validité du token JWT transmis
 * via `socket.handshake.auth.token` lors de la connexion.
 *
 * En cas de succès, enrichit `socket.data` avec les informations
 * de l'utilisateur décodées pour les utiliser dans les events suivants.
 *
 * @param {Socket} socket - L'instance Socket.IO du client qui tente de se connecter
 * @param {Function} next - Fonction à appeler pour continuer ou bloquer la connexion
 *
 * @fires next() - Connexion autorisée, socket.data.userId et socket.data.email sont définis
 * @fires next(Error) - Connexion refusée si token manquant, invalide ou expiré
 */

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Token manquant'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number
      email: string
    }
    socket.data.userId = decoded.userId
    socket.data.email = decoded.email
    next()
  } catch {
    next(new Error('Token invalide ou expiré'))
  }
}
