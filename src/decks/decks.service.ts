import { error } from 'console'
import { decksRepository } from './decks.repository'

export const decksService = {

    /**
     * Crée un nouveau deck pour un utilisateur.
     *
     * Vérifie que toutes les cartes existent avant la création.
     *
     * @param {number} id - Identifiant de l'utilisateur
     * @param {string} name - Nom du deck
     * @param {number[]} cards - Liste des identifiants des cartes
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Cartes non existantes
     * @throws {Error} Erreur lors de la création du deck
     */
    async create(id : number, name: string, cards: number[]) {

        //Test cartes existantes
        for (let index = 0; index < cards.length; index++) {
            let element = cards[index]
            if (await decksRepository.existCards(element)==false){
                throw error("Cartes non existantes");
            }
        }

        //Crée le deck et les decks cartes
        await decksRepository.create_deck(id, cards, name);

    },

    /**
     * Récupère la liste des decks appartenant à un utilisateur.
     *
     * @param {number} userId - Identifiant de l'utilisateur
     *
     * @returns {Promise<Object[]>} Liste des decks
     *
     * @throws {Error} Erreur lors de la récupération des decks
     */
    async liste(userId: number) {
        return await decksRepository.getUserDecks(userId);
    },

    /**
     * Récupère un deck par son identifiant après vérification d'accès.
     *
     * @param {number} userId - Identifiant de l'utilisateur
     * @param {number} deckId - Identifiant du deck
     *
     * @returns {Promise<Object>} Deck trouvé
     *
     * @throws {Error} Deck non trouvé
     * @throws {Error} Accès refusé
     */
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

    /**
     * Met à jour un deck existant.
     *
     * Permet de :
     * - modifier le nom du deck
     * - remplacer totalement les cartes du deck
     *
     * @param {number} userId - Identifiant de l'utilisateur
     * @param {number} deckId - Identifiant du deck
     * @param {string} [name] - Nouveau nom du deck
     * @param {number[]} [cardIds] - Nouvelle liste de cartes (exactement 10)
     *
     * @returns {Promise<Object>} Deck mis à jour
     *
     * @throws {Error} Deck non trouvé
     * @throws {Error} Accès refusé
     * @throws {Error} Cartes invalides
     * @throws {Error} Il faut exactement 10 cartes
     * @throws {Error} Cartes non existantes
     */
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

     /**
     * Supprime un deck appartenant à un utilisateur.
     *
     * @param {number} userId - Identifiant de l'utilisateur
     * @param {number} deckId - Identifiant du deck
     *
     * @returns {Promise<void>} Aucun retour
     *
     * @throws {Error} Deck non trouvé
     * @throws {Error} Accès refusé
     */
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