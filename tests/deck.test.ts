import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import deckRouter from '../src/decks/decks.route';
import { prismaMock } from './vitest.setup';
import jwt from 'jsonwebtoken';
import type { Deck, Card, DeckCard, PokemonType } from '../src/generated/prisma/client';

vi.mock('jsonwebtoken');

describe('Decks Routes - CRUD Complet', () => {
    let app: Application;
    const validToken = 'valid-jwt-token';
    const userId = 1;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/', deckRouter);
        
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        vi.mocked(jwt.verify).mockImplementation(() => ({ userId, email: 'test@example.com' }));
    });

    describe('POST /decks - Création', () => {
        const validDeckData = {
            name: 'Mon Super Deck',
            cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        };

        it('devrait créer un deck avec succès', async () => {
            const mockDeck: Deck = {
                id: 1,
                name: validDeckData.name,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockCard: Card = {
                id: 1,
                name: 'Test Card',
                attack: 1,
                hp: 1,
                imgUrl: 'test.jpg',
                type : 'Grass',
                pokedexNumber : 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDeckCard: DeckCard = {
                id: 1,
                deckId: 1,
                cardId: 1,
            };

            prismaMock.card.findUnique.mockResolvedValue(mockCard);
            prismaMock.deck.create.mockResolvedValue(mockDeck);
            prismaMock.deckCard.create.mockResolvedValue(mockDeckCard);

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send(validDeckData);

            expect(response.status).toBe(201);
            expect(response.body).toBe('Deck créé');
        });

        it('devrait retourner 401 si l\'utilisateur n\'est pas connecté', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const response = await request(app)
                .post('/decks')
                .send(validDeckData);

            expect(response.status).toBe(401);
        });

        it('devrait retourner 400 si le nom est manquant', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(response.status).toBe(400);
            expect(response.body).toBe('Nom non rempli');
        });

        it('devrait retourner 400 si les cartes ne sont pas un tableau', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Test Deck', cards: 'not-an-array' });

            expect(response.status).toBe(400);
            expect(response.body).toBe('Cartes manquantes ou invalides');
        });

        it('devrait retourner 400 s\'il n\'y a pas exactement 10 cartes', async () => {
            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Test Deck', cards: [1, 2, 3, 4, 5] });

            expect(response.status).toBe(400);
            expect(response.body).toBe("Il n'y a pas 10 cartes");
        });

        it('devrait retourner 400 si une carte n\'existe pas', async () => {
            const mockCard: Card = {
                id: 1,
                name: 'Test Card',
                attack: 1,
                hp: 1,
                imgUrl: 'test.jpg',
                type : 'Grass',
                pokedexNumber : 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.card.findUnique.mockResolvedValueOnce(mockCard);
            prismaMock.card.findUnique.mockResolvedValueOnce(null);

            const response = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send(validDeckData);

            expect(response.status).toBe(500);
        });
    });

    describe('GET /decks/mine - Liste des decks', () => {
        it('devrait retourner tous les decks de l\'utilisateur', async () => {
            const mockDecks: Deck[] = [
                {
                    id: 1,
                    name: 'Deck 1',
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'Deck 2',
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            prismaMock.deck.findMany.mockResolvedValue(mockDecks);

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(JSON.parse(JSON.stringify(mockDecks)));
            expect(prismaMock.deck.findMany).toHaveBeenCalledWith({
                where: { userId },
            });
        });

        it('devrait retourner un tableau vide si l\'utilisateur n\'a pas de decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([]);

            const response = await request(app)
                .get('/decks/mine')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('devrait retourner 401 si non connecté', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const response = await request(app).get('/decks/mine');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /decks/:id - Lecture d\'un deck', () => {
        const deckId = 1;

        it('devrait retourner un deck spécifique', async () => {
            const mockDeck: Deck = {
                id: deckId,
                name: 'Mon Deck',
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);

            const response = await request(app)
                .get(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(JSON.parse(JSON.stringify(mockDeck)));
        });

        it('devrait retourner 404 si le deck n\'existe pas', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .get(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Deck non trouvé');
        });

        it('devrait retourner 403 si le deck appartient à un autre utilisateur', async () => {
            const otherUserDeck: Deck = {
                id: deckId,
                name: 'Autre Deck',
                userId: 999,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.deck.findUnique.mockResolvedValue(otherUserDeck);

            const response = await request(app)
                .get(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
        });

        it('devrait retourner 401 si non authentifié', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const response = await request(app).get(`/decks/${deckId}`);

            expect(response.status).toBe(401);
        });
    });

    describe('PATCH /decks/:id - Mise à jour', () => {
        const deckId = 1;
        const mockDeck: Deck = {
            id: deckId,
            name: 'Mon Deck',
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('devrait mettre à jour le nom du deck', async () => {
            const updatedDeck: Deck = { ...mockDeck, name: 'Nouveau Nom' };
            
            prismaMock.deck.findUnique
                .mockResolvedValueOnce(mockDeck)
                .mockResolvedValueOnce(updatedDeck);
            prismaMock.deck.update.mockResolvedValue(updatedDeck);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Nouveau Nom' });

            expect(response.status).toBe(200);
            expect(prismaMock.deck.update).toHaveBeenCalledWith({
                where: { id: deckId },
                data: { name: 'Nouveau Nom' },
            });
        });

        it('devrait mettre à jour les cartes du deck', async () => {
            const newCards = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
            const mockCard: Card = {
                id: 1,
                name: 'Test Card',
                attack: 1,
                hp: 1,
                imgUrl: 'test.jpg',
                type : 'Grass',
                pokedexNumber : 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDeckCard: DeckCard = {
                id: 1,
                deckId: 1,
                cardId: 1,
            };

            prismaMock.card.findUnique.mockResolvedValue(mockCard);
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });
            prismaMock.deckCard.create.mockResolvedValue(mockDeckCard);
            prismaMock.deck.findUnique
                .mockResolvedValueOnce(mockDeck)
                .mockResolvedValueOnce(mockDeck);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ cards: newCards });

            expect(response.status).toBe(200);
            expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
                where: { deckId },
            });
        });

        it('devrait retourner 400 si moins de 10 cartes', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ cards: [1, 2, 3] });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Il faut exactement 10 cartes');
        });

        it('devrait retourner 400 si une carte n\'existe pas', async () => {
            const newCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 999];
            
            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);

            const mockCard: Card = {
                id: 1,
                name: 'Test Card',
                attack: 1,
                hp: 1,
                imgUrl: 'test.jpg',
                type : 'Grass',
                pokedexNumber : 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.card.findUnique
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(null);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ cards: newCards });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Une ou plusieurs cartes n\'existent pas');
        });

        it('devrait retourner 404 si le deck n\'existe pas', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Nouveau Nom' });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Deck non trouvé');
        });

        it('devrait retourner 403 si le deck appartient à un autre utilisateur', async () => {
            const otherUserDeck: Deck = {
                ...mockDeck,
                userId: 999,
            };

            prismaMock.deck.findUnique.mockResolvedValue(otherUserDeck);

            const response = await request(app)
                .patch(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Nouveau Nom' });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
        });
    });

    describe('DELETE /decks/:id - Suppression', () => {
        const deckId = 1;
        const mockDeck: Deck = {
            id: deckId,
            name: 'Deck à supprimer',
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('devrait supprimer un deck avec succès', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });
            prismaMock.deck.delete.mockResolvedValue(mockDeck);

            const response = await request(app)
                .delete(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Deck supprimé avec succès');
            expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
                where: { deckId },
            });
            expect(prismaMock.deck.delete).toHaveBeenCalledWith({
                where: { id: deckId },
            });
        });

        it('devrait retourner 404 si le deck n\'existe pas', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .delete(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Deck non trouvé');
        });

        it('devrait retourner 403 si le deck appartient à un autre utilisateur', async () => {
            const otherUserDeck: Deck = {
                ...mockDeck,
                userId: 999,
            };

            prismaMock.deck.findUnique.mockResolvedValue(otherUserDeck);

            const response = await request(app)
                .delete(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
        });

        it('devrait retourner 401 si non authentifié', async () => {
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const response = await request(app).delete(`/decks/${deckId}`);

            expect(response.status).toBe(401);
        });

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete(`/decks/${deckId}`)
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Erreur serveur');
        });
    });

    describe('Tests d\'intégration - Scénarios complets', () => {
        it('devrait créer, lire, modifier et supprimer un deck (cycle complet)', async () => {
            const deckData = {
                name: 'Deck Complet',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            };

            const mockDeck: Deck = {
                id: 1,
                name: deckData.name,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockCard: Card = {
                id: 1,
                name: 'Test Card',
                attack: 1,
                hp: 1,
                imgUrl: 'test.jpg',
                type : 'Grass',
                pokedexNumber : 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDeckCard: DeckCard = {
                id: 1,
                deckId: 1,
                cardId: 1,
            };

            prismaMock.card.findUnique.mockResolvedValue(mockCard);
            prismaMock.deck.create.mockResolvedValue(mockDeck);
            prismaMock.deckCard.create.mockResolvedValue(mockDeckCard);

            const createResponse = await request(app)
                .post('/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send(deckData);

            expect(createResponse.status).toBe(201);

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);

            const readResponse = await request(app)
                .get('/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(readResponse.status).toBe(200);
            expect(readResponse.body.name).toBe('Deck Complet');

            const updatedDeck: Deck = { ...mockDeck, name: 'Deck Modifié' };
            prismaMock.deck.findUnique
                .mockResolvedValueOnce(mockDeck)
                .mockResolvedValueOnce(updatedDeck);
            prismaMock.deck.update.mockResolvedValue(updatedDeck);

            const updateResponse = await request(app)
                .patch('/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Deck Modifié' });

            expect(updateResponse.status).toBe(200);

            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);
            prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });
            prismaMock.deck.delete.mockResolvedValue(mockDeck);

            const deleteResponse = await request(app)
                .delete('/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(deleteResponse.status).toBe(200);
        });
    });
});