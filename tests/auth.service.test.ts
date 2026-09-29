import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    login,
    register,
    updateProfile,
    getOAuthRedirectUri
} from '../src/services/auth';
import { API_URL } from '../src/services/songs';

describe('Auth Service (front/src/services/auth)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('login', () => {
        it('debe retornar null sin invocar fetch si el email o la contraseña faltan', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const res1 = await login(null, 'password123');
            expect(res1).toBeNull();

            const res2 = await login('usuario@example.com', null);
            expect(res2).toBeNull();

            expect(fetchSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('debe enviar credenciales con POST a /auth/login e incluir cookies', async () => {
            const mockResponse = { ok: true, status: 200 } as Response;
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

            const result = await login('musico@example.com', 'secreto123');

            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/login`,
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'musico@example.com', password: 'secreto123' })
                })
            );
        });
    });

    describe('register', () => {
        it('debe enviar datos de registro a /auth/register', async () => {
            const mockResponse = { ok: true, status: 201 } as Response;
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

            const result = await register('Pedro', 'pedro@example.com', 'pass123', '+584121234567');

            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/register`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Pedro',
                        email: 'pedro@example.com',
                        password: 'pass123',
                        phoneNumber: '+584121234567'
                    })
                })
            );
        });
    });

    describe('updateProfile', () => {
        it('debe actualizar el perfil enviando cabecera Authorization cuando se proporciona token', async () => {
            const updatedUser = { id: 'u-1', name: 'Nombre Actualizado' };
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => updatedUser
            } as Response);

            const result = await updateProfile({ name: 'Nombre Actualizado' }, 'jwt-token-123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedUser);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/me`,
                expect.objectContaining({
                    method: 'PUT',
                    credentials: 'include',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer jwt-token-123',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        it('debe devolver error cuando la respuesta no es ok', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'El nombre no puede estar vacío' })
            } as Response);

            const result = await updateProfile({ name: '' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('El nombre no puede estar vacío');
        });

        it('debe capturar excepciones de red y retornar error controlado', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Fallo de red'));

            const result = await updateProfile({ name: 'Nuevo' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Fallo de red');
        });
    });

    describe('getOAuthRedirectUri', () => {
        it('debe retornar la URL de desarrollo local cuando no estamos en producción', () => {
            const uri = getOAuthRedirectUri();
            expect(uri).toBe('http://localhost:4321/auth/callback');
        });
    });
});
