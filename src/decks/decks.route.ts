import { Router } from 'express';
import { decksController } from './decks.controller.js';
import { authenticateToken } from '../auth/route/auth.route.js';

const deckRouter = Router();

/**
 * Créer un nouveau deck pour l'utilisateur authentifié.
 *
 * @route POST /decks
 * @middleware authenticateToken
 *
 * @returns {Response} 201 - Deck créé avec succès
 * @returns {Response} 400 - Données invalides
 * @returns {Response} 401 - Non authentifié
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreurs métier liées à la création du deck
 */
deckRouter.post('/decks', authenticateToken, decksController.create);

/**
 * Récupérer tous les decks appartenant à l'utilisateur authentifié.
 *
 * @route GET /decks/mine
 * @middleware authenticateToken
 *
 * @returns {Response} 200 - Liste des decks de l'utilisateur
 * @returns {Response} 401 - Non authentifié
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreur lors de la récupération des decks
 */
deckRouter.get('/decks/mine', authenticateToken, decksController.liste);

/**
 * Récupérer un deck par son identifiant.
 *
 * L'utilisateur doit être propriétaire du deck.
 *
 * @route GET /decks/:id
 * @middleware authenticateToken
 *
 * @param {string} id - Identifiant du deck
 *
 * @returns {Response} 200 - Deck trouvé
 * @returns {Response} 401 - Non authentifié
 * @returns {Response} 403 - Accès refusé
 * @returns {Response} 404 - Deck non trouvé
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Deck non trouvé ou accès refusé
 */
deckRouter.get('/decks/:id', authenticateToken, decksController.read)

/**
 * Mettre à jour un deck existant.
 *
 * Permet de modifier le nom et/ou les cartes du deck.
 * Le deck doit appartenir à l'utilisateur authentifié.
 *
 * @route PATCH /decks/:id
 * @middleware authenticateToken
 *
 * @param {string} id - Identifiant du deck
 *
 * @returns {Response} 200 - Deck mis à jour
 * @returns {Response} 400 - Données invalides
 * @returns {Response} 401 - Non authentifié
 * @returns {Response} 403 - Accès refusé
 * @returns {Response} 404 - Deck non trouvé
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Erreurs métier liées à la mise à jour
 */
deckRouter.patch('/decks/:id', authenticateToken, decksController.update);

/**
 * Supprimer un deck appartenant à l'utilisateur authentifié.
 *
 * @route DELETE /decks/:id
 * @middleware authenticateToken
 *
 * @param {string} id - Identifiant du deck
 *
 * @returns {Response} 200 - Deck supprimé avec succès
 * @returns {Response} 401 - Non authentifié
 * @returns {Response} 403 - Accès refusé
 * @returns {Response} 404 - Deck non trouvé
 * @returns {Response} 500 - Erreur serveur
 *
 * @throws {Error} Deck non trouvé ou accès refusé
 */
deckRouter.delete('/decks/:id', authenticateToken, decksController.delete);

export default deckRouter;
