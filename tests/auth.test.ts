import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { authRouter } from '../src/auth/route/auth.route';
import { prismaMock } from './vitest.setup';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '../src/generated/prisma/client';

vi.mock('bcrypt');
vi.mock('jsonwebtoken');

describe('Auth Routes', () => {
    let app: Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/auth', authRouter);
        
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('POST /auth/sign-up', () => {
        const validUserData = {
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
        };

        it('devrait créer un nouvel utilisateur avec succès', async () => {
            const hashedPassword = 'hashedPassword123';
            const mockUser: User = {
                id: 1,
                email: validUserData.email,
                username: validUserData.username,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const mockToken = 'mockToken123';

            prismaMock.user.findUnique.mockResolvedValue(null);
            vi.mocked(bcrypt.hash).mockImplementation(() => Promise.resolve(hashedPassword));
            prismaMock.user.create.mockResolvedValue(mockUser);
            vi.mocked(jwt.sign).mockImplementation(() => mockToken);

            const response = await request(app)
                .post('/auth/sign-up')
                .send(validUserData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Inscription réussie');
            expect(response.body).toHaveProperty('token', mockToken);
            expect(response.body.user).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                email: mockUser.email,
            });
        });

        it('devrait retourner 400 si des champs sont manquants', async () => {
            const response = await request(app)
                .post('/auth/sign-up')
                .send({ email: 'test@example.com' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Tous les champs sont requis');
        });

        it('devrait retourner 409 si l\'email existe déjà', async () => {
            const existingUser: User = {
                id: 1,
                email: validUserData.email,
                username: 'existinguser',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            prismaMock.user.findUnique.mockResolvedValue(existingUser);

            const response = await request(app)
                .post('/auth/sign-up')
                .send(validUserData);

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('error', 'Cet email est déjà utilisé');
        });

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/auth/sign-up')
                .send(validUserData);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Erreur serveur');
        });
    });

    describe('POST /auth/sign-in', () => {
        const validCredentials = {
            email: 'test@example.com',
            password: 'password123',
        };

        const mockUser: User = {
            id: 1,
            email: validCredentials.email,
            username: 'testuser',
            password: 'hashedPassword123',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('devrait connecter un utilisateur avec succès', async () => {
            const mockToken = 'mockToken123';

            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));
            vi.mocked(jwt.sign).mockImplementation(() => mockToken);

            const response = await request(app)
                .post('/auth/sign-in')
                .send(validCredentials);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Connexion réussie');
            expect(response.body).toHaveProperty('token', mockToken);
            expect(response.body.user).toEqual({
                id: mockUser.id,
                username: mockUser.username,
                email: mockUser.email,
            });
        });

        it('devrait retourner 400 si des champs sont manquants', async () => {
            const response = await request(app)
                .post('/auth/sign-in')
                .send({ email: 'test@example.com' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Email et mot de passe requis');
        });

        it('devrait retourner 401 si l\'utilisateur n\'existe pas', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .post('/auth/sign-in')
                .send(validCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
        });

        it('devrait retourner 401 si le mot de passe est incorrect', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false));

            const response = await request(app)
                .post('/auth/sign-in')
                .send(validCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
        });

        it('devrait retourner 500 en cas d\'erreur serveur', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/auth/sign-in')
                .send(validCredentials);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Erreur serveur');
        });
    });
});