import { Router } from 'express';
import { decksController } from './decks.controller.js';
import { authenticateToken } from '../auth/route/auth.route.js';

const deckRouter = Router();

deckRouter.post('/decks', authenticateToken, decksController.create);
deckRouter.get('/decks/mine', authenticateToken, decksController.liste);
deckRouter.get('/decks/:id', authenticateToken, decksController.read)
deckRouter.patch('/decks/:id', authenticateToken, decksController.update);
deckRouter.delete('/decks/:id', authenticateToken, decksController.delete);

export default deckRouter;
