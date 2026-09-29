import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createSong,
    updateSong,
    searchSongs,
    getSongById,
    deleteSongById,
    getAuthors,
    createAuthor,
    API_URL
} from '../src/services/songs';

describe('Songs Service (front/src/services/songs)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createSong', () => {
        it('debe rechazar la petición localmente si el título está vacío', async () => {
            const formData = new FormData();
            formData.append('title', '   ');
            formData.append('key', 'C');

            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const result = await createSong(formData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('El título de la canción es obligatorio.');
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('debe enviar la petición POST y retornar éxito cuando la respuesta es ok', async () => {
            const formData = new FormData();
            formData.append('title', 'Pescador de Hombres');
            formData.append('key', 'D');
            formData.append('content', '[D] Tú has venido a la orilla');
            formData.append('categoryIds', '1');
            formData.append('categoryIds', '3');

            const mockCreatedSong = {
                id: 10,
                title: 'Pescador de Hombres',
                key: 'D',
                content: '[D] Tú has venido a la orilla'
            };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockCreatedSong
            } as Response);

            const result = await createSong(formData, 'mock-jwt-token');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCreatedSong);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/songs`,
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-jwt-token',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        it('debe manejar respuestas de error del servidor (status 400/500)', async () => {
            const formData = new FormData();
            formData.append('title', 'Canción Duplicada');

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Ya existe una canción con ese título' })
            } as Response);

            const result = await createSong(formData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Error al guardar la canción.');
            expect(result.data).toEqual({ error: 'Ya existe una canción con ese título' });
        });

        it('debe capturar errores de red/conexión y devolver mensaje controlado', async () => {
            const formData = new FormData();
            formData.append('title', 'Canción Sin Red');

            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

            const result = await createSong(formData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Error de conexión con el servidor.');
        });
    });

    describe('searchSongs', () => {
        it('debe buscar canciones por query y categoría', async () => {
            const mockSongs = [
                { id: 1, title: 'Alabaré', key: 'G' },
                { id: 2, title: 'Alabanza al Señor', key: 'D' }
            ];

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockSongs
            } as Response);

            const result = await searchSongs('Alab', '2');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSongs);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/songs?q=Alab&categoryId=2`
            );
        });

        it('debe manejar respuestas no exitosas al buscar', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false
            } as Response);

            const result = await searchSongs('test');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Error al buscar canciones.');
        });
    });

    describe('getSongById', () => {
        it('debe consultar la canción por su ID', async () => {
            const mockSong = { id: 5, title: 'Gloria a Dios', key: 'C' };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockSong
            } as Response);

            const result = await getSongById(5);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSong);
            expect(globalThis.fetch).toHaveBeenCalledWith(`${API_URL}/songs/5`);
        });

        it('debe retornar error controlado si la canción no existe (404)', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false
            } as Response);

            const result = await getSongById(999);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Error al obtener la canción.');
        });
    });

    describe('deleteSongById', () => {
        it('debe enviar la petición DELETE con token de autorización', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true
            } as Response);

            const result = await deleteSongById(12, 'auth-token-xyz');

            expect(result.success).toBe(true);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/songs/12`,
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer auth-token-xyz'
                    }),
                    credentials: 'include'
                })
            );
        });

        it('debe retornar el mensaje de error que responde el servidor', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'No tienes permisos para eliminar esta canción' })
            } as Response);

            const result = await deleteSongById(12, 'token');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No tienes permisos para eliminar esta canción');
        });
    });

    describe('getAuthors y createAuthor', () => {
        it('debe obtener la lista de autores', async () => {
            const mockAuthors = [{ id: 1, name: 'San Francisco de Asís' }];

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => mockAuthors
            } as Response);

            const result = await getAuthors();
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockAuthors);
        });

        it('debe crear un autor enviando el payload correspondiente', async () => {
            const newAuthor = { id: 2, name: 'Cesáreo Gabaráin' };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => newAuthor
            } as Response);

            const result = await createAuthor('Cesáreo Gabaráin', 'token');
            expect(result.success).toBe(true);
            expect(result.data).toEqual(newAuthor);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${API_URL}/authors`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ name: 'Cesáreo Gabaráin' })
                })
            );
        });
    });
});
