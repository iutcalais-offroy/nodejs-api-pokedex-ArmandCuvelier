import {Request, Response, Router} from 'express'

import {prisma} from "../database"

export const cardsRouter = Router()

// Get /cards
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
