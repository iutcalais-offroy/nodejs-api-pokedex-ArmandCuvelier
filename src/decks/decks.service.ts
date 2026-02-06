import { error } from 'console'
import { decksRepository } from './decks.repository'

export const decksService = {

    async create(id : number, name: string, cards: number[]) {

        //Test cartes existantes
        for (let index = 0; index < cards.length; index++) {
            let element = cards[index]
            if (await decksRepository.existCards(element)==false){
                return error("Cartes non existantes")
            }
        }

        //Crée le deck et les decks cartes
        await decksRepository.create_deck(id, cards, name);

    },

    async liste(userId: number) {
        return await decksRepository.getUserDecks(userId);
    },

    async read(userId: number, deckId: number) {
        const deck = await decksRepository.getDeckById(deckId);

        // Deck n'existe pas
        if (!deck) {
            throw new Error("Deck non trouvé");
        }

        // Deck n'appartient pas à l'utilisateur
        if (deck.userId !== userId) {
            throw new Error("Accès refusé");
        }

        return deck;
    },

    async update(userId: number, deckId: number, name?: string, cardIds?: number[]) {
        
        //Vérifier que le deck existe
        const deck = await decksRepository.getDeckById(deckId);
        if (!deck){
            throw new Error("Deck non trouvé");
        }
        if (deck.userId !== userId){
            throw new Error("Accès refusé");
        }

        //Changer les cartes si il ya un tableau de cartes données
        if (cardIds !== undefined) {
            if (!Array.isArray(cardIds)){
                throw new Error("Cartes invalides");
            }
            if (cardIds.length !== 10){
                throw new Error("Il faut exactement 10 cartes");
            }
            
            //Vérifier que toutes les cartes existent
            for (const cardId of cardIds) {
                if (!await decksRepository.existCards(cardId)) {
                    throw new Error("Cartes non existantes");
                }
            }
            
            //Supprimer les anciennes et créer les nouvelles
            await decksRepository.deleteDeckCards(deckId);
            await decksRepository.createDeckCards(deckId, cardIds);
        }

        //Changer le nom si il est différent
        if (name !== undefined && name.trim() !== "") {
            await decksRepository.updateDeckName(deckId, name);
        }

        return await decksRepository.getDeckById(deckId);
    },

    async delete(userId: number, deckId: number) {

        const deck = await decksRepository.getDeckById(deckId);

        // Vérifier si le deck existe
        if (!deck) {
            throw new Error("Deck non trouvé");
        }

        // Vérifier que le deck appartient à l'utilisateur
        if (deck.userId !== userId) {
            throw new Error("Accès refusé");
        }

        await decksRepository.deleteDeck(deckId);
    },
}