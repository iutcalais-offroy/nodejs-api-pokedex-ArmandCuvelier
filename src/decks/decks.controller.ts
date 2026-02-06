import type { Request, Response } from 'express';
import { decksService } from './decks.service.js';

export const decksController = {

    //create the decks
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

    // list the deck of the user
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

    // get the decks of the user depends of the deck id's
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

    // update the deck depends of id, of the user
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

    // delete a deck only if it's an deck of the user
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