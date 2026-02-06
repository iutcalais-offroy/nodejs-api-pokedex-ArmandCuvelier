import { prisma } from '../database'

export const decksRepository = {

    //return a boolen depends of the existence of a cards
    async existCards(card_id:number) {
        const results = await prisma.card.findUnique({where: {id : card_id}});
        if (!results) {
            return false
        }
        return true
    },

    //Crée le deck
    async create_deck(id:number,card:number[],name:string){

        const deck = await prisma.deck.create({
            data : {
                name : name,
                userId : id
            }
        });

        // Crée des deckCards
        for (let index = 0; index < card.length; index++) {
            const element = card[index];
            await prisma.deckCard.create({
                data : {
                    cardId : element,
                    deckId : deck.id,
                }
            })
        }
    },

    //Récupère les decks de l'user
    async getUserDecks(userId: number) {
        return await prisma.deck.findMany({where: {userId: userId}});
    },

    //Récupère le deck de l'utilisateurs
    async getDeckById(deckId: number) {
        return await prisma.deck.findUnique({where: { id: deckId },});
    },

    // Supprimer toutes les deckCards d'un deck
    async deleteDeckCards(deckId: number) {
        await prisma.deckCard.deleteMany({
            where: { deckId: deckId }
        });
    },

    // Mettre à jour le nom du deck
    async updateDeckName(deckId: number, name: string) {
        return await prisma.deck.update({
            where: { id: deckId },
            data: { name: name }
        });
    },

    // Créer de nouvelles deckCards
    async createDeckCards(deckId: number, cardIds: number[]) {
        for (const cardId of cardIds) {
            await prisma.deckCard.create({
                data: {
                    cardId: cardId,
                    deckId: deckId,
                }
            })
        }
    },

    //Supprime le deck et les deckcards
    async deleteDeck(deckId: number) {
        await prisma.deckCard.deleteMany({where: {deckId: deckId}});
        await prisma.deck.delete({where: {id: deckId}});
    }

}