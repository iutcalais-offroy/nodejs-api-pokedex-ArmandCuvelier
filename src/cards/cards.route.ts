import {Request, Response, Router} from 'express'

import {prisma} from "../database"

export const cardsRouter = Router()

/**
 * Route de récupération de toutes les cartes.
 *
 * Les cartes sont retournées triées par numéro de Pokédex croissant.
 *
 * @route GET /cards
 *
 * @param {Request} _req - Requête HTTP Express
 * @param {Response} res - Réponse HTTP Express
 *
 * @returns {Response} 200 - Liste des cartes
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreur lors de l'accès à la base de données
 */
cardsRouter.get('/cards', async(_req: Request, res: Response) => {
    try {

        //get all the cards
        const cards = await prisma.card.findMany({
            orderBy : {
                pokedexNumber: 'asc'
            }
        })

        // Retourner le token - 200
        return res.status(200).json(cards)

    } catch (error) {
        console.error('Erreur lors du récupérage des cartes',error)
        return res.status(500).json({error : 'Erreur serveur'})
    }
})
