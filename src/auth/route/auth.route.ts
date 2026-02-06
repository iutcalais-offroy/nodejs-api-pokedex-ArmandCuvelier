import {Request, Response, Router, NextFunction} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from "../../database"
import 'dotenv/config'

export const authRouter = Router()


/**
 * Route d'inscription d'un nouvel utilisateur.
 *
 * @route POST /auth/sign-up
 *
 * @param {Request} req - Requête HTTP Express
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Adresse email de l'utilisateur
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 *
 * @param {Response} res - Réponse HTTP Express
 *
 * @returns {Response} 201 - Utilisateur créé avec succès et JWT
 * @returns {Response} 400 - Champs manquants
 * @returns {Response} 409 - Email déjà utilisé
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreur lors de l'accès à la base de données ou du hashage
 */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    try {
        const {email, username, password} = req.body

        // Validation des champs - 400
        if (!email || !username || !password) {
            return res.status(400).json({error: 'Tous les champs sont requis'})
        }

        // Vérifier que l'email n'existe pas déjà - 409
        const existingUser = await prisma.user.findUnique({
            where: {email},
        })

        if (existingUser) {
            return res.status(409).json({error: 'Cet email est déjà utilisé'})
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10)

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // Retourner le token - 201
        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

/**
 * Route de connexion d'un utilisateur existant.
 *
 * @route POST /auth/sign-in
 *
 * @param {Request} req - Requête HTTP Express
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Adresse email de l'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 *
 * @param {Response} res - Réponse HTTP Express
 *
 * @returns {Response} 200 - Connexion réussie avec JWT
 * @returns {Response} 400 - Champs manquants
 * @returns {Response} 401 - Identifiants incorrects
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreur lors de la comparaison du mot de passe ou accès DB
 */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body

        // Validation des champs - 400
        if (!email || !password) {
            return res.status(400).json({error: 'Email et mot de passe requis'})
        }

        // Vérifier que l'utilisateur existe - 401
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Vérifier le mot de passe - 401
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // Retourner le token - 200
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

declare global {
    namespace Express {
        interface Request {
            userId?: number
        }
    }
}

/**
 * Middleware d'authentification JWT.
 *
 * Vérifie la présence et la validité du token JWT
 * et ajoute l'identifiant utilisateur à la requête.
 *
 * @param {Request} req - Requête HTTP Express
 * @param {Response} res - Réponse HTTP Express
 * @param {NextFunction} next - Fonction middleware suivante
 *
 * @returns {Response} 401 - Token manquant
 * @returns {Response} 403 - Token invalide ou expiré
 * @returns {void} Passe au middleware suivant si valide
 *
 * @throws {Error} Erreur lors de la vérification du token
 */
export const authenticateToken = (req: Request,res: Response,next: NextFunction) => {
    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({error: 'Token manquant'})
    }

    try {
        // 2. Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // 3. Ajouter userId à la requête pour l'utiliser dans les routes
        req.userId = decoded.userId;


        // 4. Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        return res.status(403).json({error: 'Token invalide ou expiré'})
    }
}