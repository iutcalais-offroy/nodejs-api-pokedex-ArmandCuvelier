import type { Request, Response } from 'express';
import { decksService } from './decks.service.js';

export const decksController = {

    /**
     * Créer un nouveau deck pour l'utilisateur authentifié.
     *
     * @param {Request} req - Requête HTTP Express
     * @param {number} req.userId - Identifiant de l'utilisateur (injecté par le middleware JWT)
     * @param {Object} req.body - Corps de la requête
     * @param {string} req.body.name - Nom du deck
     * @param {number[]} req.body.cards - Liste de 10 identifiants de cartes
     *
     * @param {Response} res - Réponse HTTP Express
     *
     * @returns {Response} 201 - Deck créé avec succès
     * @returns {Response} 400 - Données invalides
     * @returns {Response} 401 - Utilisateur non authentifié
     * @returns {Response} 500 - Erreur serveur
     *
     * @throws {Error} Cartes non existantes
     */
    async create(_req: Request, res: Response){
        try{

            //Récupère les informations du body
            const {name, cards} = _req.body;
            const id = _req.userId;

            //Si pas d'id
            if (!id){
                return res.status(400).json('pas connecté');
            }

            //Test 10 cartes
            if (!Array.isArray(cards)) {
                return res.status(400).json("Cartes manquantes ou invalides");
            }
            if (cards.length != 10){
                return res.status(400).json("Il n'y a pas 10 cartes");
            }

            //Test non vide
            if (!name){
                return res.status(400).json("Nom non rempli");
            }

            await decksService.create(id, name, cards)
            return res.status(201).json("Deck créé")
        }
        catch (error) {

            //si c'est l'id des cartes
            if (error=="Cartes non existantes"){
                res.status(400);
            }

            //Erreur serveur
            console.log(error);
            return res.status(500).json("Erreur serveur");
        }
    },

    /**
     * Récupérer tous les decks de l'utilisateur authentifié.
     *
     * @param {Request} req - Requête HTTP Express
     * @param {number} req.userId - Identifiant de l'utilisateur
     * @param {Response} res - Réponse HTTP Express
     *
     * @returns {Response} 200 - Liste des decks
     * @returns {Response} 401 - Utilisateur non authentifié
     * @returns {Response} 500 - Erreur serveur
     *
     * @throws {Error} Erreur lors de la récupération des decks
     */
    async liste(_req: Request, res: Response){
        try {
            const id = _req.userId;
            
            if (!id){
                return res.status(401).json({ error: "Non connecté" });
            }
            
            const decks = await decksService.liste(id);
            return res.status(200).json(decks);
            
        } catch (error) {
            console.error("Erreur liste decks:", error);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    },

    /**
     * Récupérer un deck par son identifiant.
     *
     * Vérifie que le deck existe et appartient à l'utilisateur.
     *
     * @param {Request} req - Requête HTTP Express
     * @param {number} req.userId - Identifiant de l'utilisateur
     * @param {string} req.params.id - Identifiant du deck
     * @param {Response} res - Réponse HTTP Express
     *
     * @returns {Response} 200 - Deck trouvé
     * @returns {Response} 401 - Non authentifié
     * @returns {Response} 403 - Accès refusé
     * @returns {Response} 404 - Deck non trouvé
     * @returns {Response} 500 - Erreur serveur
     *
     * @throws {Error} Deck non trouvé
     * @throws {Error} Accès refusé
     */
    async read(_req: Request, res: Response){
        try {
            const id_user = _req.userId;
            const id_deck = parseInt(_req.params.id);
            
            if (!id_user){
                return res.status(401).json({ error: "Non authentifié" });
            }

            const deck = await decksService.read(id_user, id_deck);
            return res.status(200).json(deck);
        }
        catch (error){
            if (error instanceof Error) {
                if (error.message === "Deck non trouvé") {
                    return res.status(404).json({ error: "Deck non trouvé" });
                }
                if (error.message === "Accès refusé") {
                    return res.status(403).json({ error: "Accès refusé à ce deck" });
                }
            }
            console.log()
            return res.status(500).json({ error: "Erreur serveur" });
        }
    },

    /**
     * Mettre à jour un deck existant.
     *
     * Permet de modifier le nom et/ou les cartes du deck.
     *
     * @param {Request} req - Requête HTTP Express
     * @param {number} req.userId - Identifiant de l'utilisateur
     * @param {string} req.params.id - Identifiant du deck
     * @param {Object} req.body - Données de mise à jour
     * @param {string} [req.body.name] - Nouveau nom du deck
     * @param {number[]} [req.body.cards] - Nouvelle liste de cartes
     * @param {Response} res - Réponse HTTP Express
     *
     * @returns {Response} 200 - Deck mis à jour
     * @returns {Response} 400 - Données invalides
     * @returns {Response} 401 - Non authentifié
     * @returns {Response} 403 - Accès refusé
     * @returns {Response} 404 - Deck non trouvé
     * @returns {Response} 500 - Erreur serveur
     *
     * @throws {Error} Erreurs métier liées aux règles de mise à jour
     */
    async update(_req: Request, res: Response){
        try {
            const id_user = _req.userId;
            const id_deck = parseInt(_req.params.id);
            
            //User non connecté
            if (!id_user) {
                return res.status(401).json({ error: "Non authentifié" });
            }
            const {name, cards} = _req.body;

            const updatedDeck = await decksService.update(id_user, id_deck, name, cards);
            return res.status(200).json(updatedDeck);
        }
        catch (error) {
            console.error("Erreur update deck:", error);
            if (error instanceof Error) {
                    // Deck inexistant
                    if (error.message === "Deck non trouvé") {
                        return res.status(404).json({ error: "Deck non trouvé" });
                    }
                    
                    // Deck n'appartient pas à l'utilisateur
                    if (error.message === "Accès refusé") {
                        return res.status(403).json({ error: "Accès refusé à ce deck" });
                    }
                    
                    // Nombre de cartes incorrect
                    if (error.message === "Il faut exactement 10 cartes") {
                        return res.status(400).json({ error: "Il faut exactement 10 cartes" });
                    }
                    
                    // Cartes inexistantes
                    if (error.message === "Cartes non existantes") {
                        return res.status(400).json({ error: "Une ou plusieurs cartes n'existent pas" });
                    }
                    
                    // Format invalide
                    if (error.message === "Cartes invalides") {
                        return res.status(400).json({ error: "Format de cartes invalide" });
                    }
                }
            return res.status(500).json({ error: "Erreur serveur" });
        }
    },

    /**
     * Supprimer un deck appartenant à l'utilisateur authentifié.
     *
     * @param {Request} req - Requête HTTP Express
     * @param {number} req.userId - Identifiant de l'utilisateur
     * @param {string} req.params.id - Identifiant du deck
     * @param {Response} res - Réponse HTTP Express
     *
     * @returns {Response} 200 - Deck supprimé avec succès
     * @returns {Response} 401 - Non authentifié
     * @returns {Response} 403 - Accès refusé
     * @returns {Response} 404 - Deck non trouvé
     * @returns {Response} 500 - Erreur serveur
     *
     * @throws {Error} Deck non trouvé
     * @throws {Error} Accès refusé
     */
    async delete(_req: Request, res: Response){
        try {
            const id_user = _req.userId;
            const id_deck = parseInt(_req.params.id);
            
            //User non connecté
            if (!id_user){
                return res.status(401).json({ error: "Non authentifié" });
            }

            await decksService.delete(id_user, id_deck);
            return res.status(200).json({ message: "Deck supprimé avec succès" });
        }
        catch (error){
            console.error("Erreur delete deck:", error);

            if (error instanceof Error) {
                //Deck pas trouvé
                if (error.message === "Deck non trouvé") {
                    return res.status(404).json({ error: "Deck non trouvé" });
                }
                //Id non correspoondant au propriétaire du deck
                if (error.message === "Accès refusé") {
                    return res.status(403).json({ error: "Accès refusé à ce deck" });
                }
            }
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }
};