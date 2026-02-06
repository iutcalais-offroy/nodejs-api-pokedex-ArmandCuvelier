import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { cardsRouter } from '../src/cards/cards.route';
import { prismaMock } from './vitest.setup';
import type { Card } from '../src/generated/prisma/client';

describe('Cards Routes', () => {
    let app: Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/', cardsRouter);
        
        vi.clearAllMocks();
    });

    describe('GET /cards', () => {
        it('devrait retourner toutes les cartes triées par numéro Pokédex', async () => {
            const mockCards: Card[] = [
                {
                    id: 1,
                    name: 'Bulbizarre',
                    pokedexNumber: 1,
                    type: 'Grass' as any,
                    hp: 45,
                    attack: 49,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'Herbizarre',
                    pokedexNumber: 2,
                    type: 'Grass' as any,
                    hp: 60,
                    attack: 62,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 3,
                    name: 'Florizarre',
                    pokedexNumber: 3,
                    type: 'Grass' as any,
                    hp: 80,
                    attack: 82,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app).get('/cards');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(JSON.parse(JSON.stringify(mockCards)));
            expect(prismaMock.card.findMany).toHaveBeenCalledWith({
                orderBy: {
                    pokedexNumber: 'asc',
                },
            });
        });

        it('devrait retourner un tableau vide s\'il n\'y a pas de cartes', async () => {
            prismaMock.card.findMany.mockResolvedValue([]);

            const response = await request(app).get('/cards');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/cards');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Erreur serveur');
        });

        it('devrait retourner les cartes avec tous les champs nécessaires', async () => {
            const mockCards: Card[] = [
                {
                    id: 25,
                    name: 'Pikachu',
                    pokedexNumber: 25,
                    type: 'Electric' as any,
                    hp: 35,
                    attack: 55,
                    imgUrl: 'pikachu.png',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app).get('/cards');

            expect(response.status).toBe(200);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('pokedexNumber');
            expect(response.body[0]).toHaveProperty('type');
            expect(response.body[0]).toHaveProperty('hp');
        });

        it('devrait trier les cartes dans l\'ordre croissant du numéro Pokédex', async () => {
            const mockCards: Card[] = [
                {
                    id: 1,
                    name: 'Bulbizarre',
                    pokedexNumber: 1,
                    type: 'Grass' as any,
                    hp: 45,
                    attack: 49,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 4,
                    name: 'Salamèche',
                    pokedexNumber: 4,
                    type: 'Fire' as any,
                    hp: 39,
                    attack: 52,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 7,
                    name: 'Carapuce',
                    pokedexNumber: 7,
                    type: 'Water' as any,
                    hp: 44,
                    attack: 48,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 25,
                    name: 'Pikachu',
                    pokedexNumber: 25,
                    type: 'Electric' as any,
                    hp: 35,
                    attack: 55,
                    imgUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app).get('/cards');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(4);
            
            for (let i = 0; i < response.body.length - 1; i++) {
                expect(response.body[i].pokedexNumber).toBeLessThan(
                    response.body[i + 1].pokedexNumber
                );
            }
        });

        it('devrait appeler findMany une seule fois', async () => {
            prismaMock.card.findMany.mockResolvedValue([]);

            await request(app).get('/cards');

            expect(prismaMock.card.findMany).toHaveBeenCalledTimes(1);
        });
    });
});