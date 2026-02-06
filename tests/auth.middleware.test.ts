import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../src/auth/route/auth.route';
import jwt, { JwtPayload } from 'jsonwebtoken';

vi.mock('jsonwebtoken');

interface DecodedToken extends JwtPayload {
    userId: number;
    email: string;
}

interface RequestWithUserId extends Request {
    userId?: number;
}

describe('Authentication Middleware', () => {
    let mockRequest: Partial<RequestWithUserId>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';

        mockRequest = {
            headers: {},
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        nextFunction = vi.fn();
    });

    it('devrait authentifier avec succès un token valide', () => {
        const mockToken = 'valid-token';
        const mockDecoded: DecodedToken = {
            userId: 1,
            email: 'test@example.com',
        };

        mockRequest.headers = {
            authorization: `Bearer ${mockToken}`,
        };

        (jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue(mockDecoded);

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
        expect(mockRequest.userId).toBe(1);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si aucun token n\'est fourni', () => {
        mockRequest.headers = {};

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si le header Authorization est mal formaté', () => {
        mockRequest.headers = {
            authorization: 'InvalidFormat',
        };

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token manquant' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si le token est invalide', () => {
        const mockToken = 'invalid-token';

        mockRequest.headers = {
            authorization: `Bearer ${mockToken}`,
        };

        (jwt.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si le token est expiré', () => {
        const mockToken = 'expired-token';

        mockRequest.headers = {
            authorization: `Bearer ${mockToken}`,
        };

        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        (jwt.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
            throw error;
        });

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('devrait ajouter userId à la requête lors d\'une authentification réussie', () => {
        const mockToken = 'valid-token';
        const mockDecoded: DecodedToken = {
            userId: 42,
            email: 'user@example.com',
        };

        mockRequest.headers = {
            authorization: `Bearer ${mockToken}`,
        };

        (jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue(mockDecoded);

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockRequest.userId).toBe(42);
        expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer le format "Bearer" avec des espaces supplémentaires', () => {
        const mockToken = 'valid-token';
        const mockDecoded: DecodedToken = {
            userId: 1,
            email: 'test@example.com',
        };

        mockRequest.headers = {
            authorization: `Bearer ${mockToken}`,
        };

        (jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue(mockDecoded);

        authenticateToken(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
    });
});