import { prisma } from '../database'

export const decksRepository = {

    /**
     * Vérifie l'existence d'une carte en base de données.
     *
     * @param {number} card_id - Identifiant de la carte
     *
     * @returns {Promise<boolean>} true si la carte existe, false sinon
     *
     * @throws {Error} Erreur lors de l'accès à la base de données
     */
    async existCards(card_id:number) {
        const results = await prisma.card.findUnique({where: {id : card_id}});
        if (!results) {
            return false
        }
        return true
    },

    /**
     * Crée un nouveau deck et associe des cartes à ce deck.
     *
     * @param {number} id - Identifiant de l'utilisateur propriétaire du deck
     * @param {number[]} card - Liste des identifiants des cartes à ajouter
     * @param {string} name - Nom du deck
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Erreur lors de la création du deck ou des deckCards
     */
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

    /**
     * Récupère tous les decks appartenant à un utilisateur.
     *
     * @param {number} userId - Identifiant de l'utilisateur
     *
     * @returns {Promise<Object[]>} Liste des decks de l'utilisateur
     *
     * @throws {Error} Erreur lors de la récupération des decks
     */
    async getUserDecks(userId: number) {
        return await prisma.deck.findMany({where: {userId: userId}});
    },

    /**
     * Récupère un deck par son identifiant.
     *
     * @param {number} deckId - Identifiant du deck
     *
     * @returns {Promise<Object | null>} Deck trouvé ou null s'il n'existe pas
     *
     * @throws {Error} Erreur lors de la récupération du deck
     */
    async getDeckById(deckId: number) {
        return await prisma.deck.findUnique({where: { id: deckId },});
    },

    /**
     * Supprime toutes les cartes associées à un deck.
     *
     * @param {number} deckId - Identifiant du deck
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Erreur lors de la suppression des deckCards
     */
    async deleteDeckCards(deckId: number) {
        await prisma.deckCard.deleteMany({
            where: { deckId: deckId }
        });
    },

    /**
     * Met à jour le nom d'un deck.
     *
     * @param {number} deckId - Identifiant du deck
     * @param {string} name - Nouveau nom du deck
     *
     * @returns {Promise<Object>} Deck mis à jour
     *
     * @throws {Error} Erreur lors de la mise à jour du deck
     */
    async updateDeckName(deckId: number, name: string) {
        return await prisma.deck.update({
            where: { id: deckId },
            data: { name: name }
        });
    },

    /**
     * Ajoute de nouvelles cartes à un deck existant.
     *
     * @param {number} deckId - Identifiant du deck
     * @param {number[]} cardIds - Liste des identifiants des cartes à ajouter
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Erreur lors de la création des deckCards
     */
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

    /**
     * Supprime un deck et toutes les cartes associées.
     *
     * @param {number} deckId - Identifiant du deck
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Erreur lors de la suppression du deck ou des deckCards
     */
    async deleteDeck(deckId: number) {
        await prisma.deckCard.deleteMany({where: {deckId: deckId}});
        await prisma.deck.delete({where: {id: deckId}});
    }

}