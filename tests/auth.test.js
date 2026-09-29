import { describe, it, expect, vi } from 'vitest';
import { getUserFromToken, hasPermission } from '../src/utils/auth';

describe('Auth Utilities (front/src/utils/auth)', () => {
    describe('getUserFromToken', () => {
        it('debe retornar null para token nulo, indefinido o vacío', () => {
            expect(getUserFromToken(null)).toBeNull();
            expect(getUserFromToken(undefined)).toBeNull();
            expect(getUserFromToken('')).toBeNull();
        });

        it('debe decodificar y extraer el payload de un token JWT válido', () => {
            const payload = {
                id: 'usr-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'ADMIN',
                permissions: ['SONG_CREATE']
            };
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `header.${encodedPayload}.signature`;

            const user = getUserFromToken(token);
            expect(user).toEqual(payload);
        });

        it('debe retornar null y manejar el error si el token es inválido o no contiene base64 válido', () => {
            const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const invalidToken = 'invalido';

            expect(getUserFromToken(invalidToken)).toBeNull();
            spyError.mockRestore();
        });
    });

    describe('hasPermission', () => {
        it('debe retornar false si el usuario es nulo o indefinido', () => {
            expect(hasPermission(null, 'SONG_CREATE')).toBe(false);
            expect(hasPermission(undefined, 'SONG_CREATE')).toBe(false);
        });

        it('debe retornar true para cualquier permiso si el usuario tiene rol ADMIN', () => {
            const adminUser = { id: 'adm-1', role: 'ADMIN', permissions: [] };
            expect(hasPermission(adminUser, 'CUALQUIER_PERMISO')).toBe(true);
            expect(hasPermission(adminUser, 'SONG_DELETE')).toBe(true);
        });

        it('debe retornar true si el usuario regular posee el permiso solicitado', () => {
            const user = {
                id: 'usr-2',
                role: 'USER',
                permissions: ['SONG_READ', 'SONG_CREATE']
            };
            expect(hasPermission(user, 'SONG_CREATE')).toBe(true);
            expect(hasPermission(user, 'SONG_READ')).toBe(true);
        });

        it('debe retornar false si el usuario regular no posee el permiso solicitado', () => {
            const user = {
                id: 'usr-2',
                role: 'USER',
                permissions: ['SONG_READ']
            };
            expect(hasPermission(user, 'SONG_CREATE')).toBe(false);
            expect(hasPermission(user, 'SONG_DELETE')).toBe(false);
        });

        it('debe manejar usuarios sin propiedad permissions de manera segura', () => {
            const user = { id: 'usr-3', role: 'USER' };
            expect(hasPermission(user, 'SONG_READ')).toBe(false);
        });
    });
});
