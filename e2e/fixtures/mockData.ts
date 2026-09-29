/**
 * Datos simulados (mocks) para pruebas E2E deterministas
 */

export const mockUser = {
  id: 1,
  name: 'Músico de Prueba',
  email: 'test@cancionero.online',
  role: 'USER',
  permissions: ['song.create', 'song.edit'],
};

export const mockSong = {
  id: 101,
  title: 'Pescador de Hombres',
  tone: 'D',
  author: 'Cesáreo Gabaráin',
  category: 'Comunión',
  lyrics: `[D] Tú has venido a la [A] orilla,
[G] no has buscado a sabios ni a [A] ricos,
[D] tan sólo quieres que [A] yo te [D] siga.

Coro:
[G] Señor, me has mirado a los [D] ojos,
[A] sonriendo has dicho mi [D] nombre.`,
};

export const mockCategories = [
  { id: 1, name: 'Entrada' },
  { id: 2, name: 'Piedad' },
  { id: 3, name: 'Gloria' },
  { id: 4, name: 'Aleluya' },
  { id: 5, name: 'Ofertorio' },
  { id: 6, name: 'Santo' },
  { id: 7, name: 'Comunión' },
  { id: 8, name: 'Salida' },
];
