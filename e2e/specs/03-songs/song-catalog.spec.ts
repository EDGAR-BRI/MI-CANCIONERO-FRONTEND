import { test, expect } from '@playwright/test';

test.describe('Catálogo y Listado de Canciones', () => {
  test('Renderiza tarjetas de canciones simuladas en la cuadrícula', async ({ page }) => {
    // Interceptar llamadas al API de canciones para garantizar determinismo
    await page.route('**/api/songs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 101,
            title: 'Pescador de Hombres',
            key: 'D',
            author: { id: 1, name: 'Cesáreo Gabaráin' },
            categories: [{ id: 7, name: 'Comunión' }],
          },
          {
            id: 102,
            title: 'Alabado Sea el Santísimo',
            key: 'G',
            author: { id: 2, name: 'Tradicional' },
            categories: [{ id: 7, name: 'Comunión' }],
          },
        ]),
      });
    });

    await page.route('**/api/stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalSongs: 2,
          totalCategories: 1,
          activeSongs: 2,
        }),
      });
    });

    await page.goto('/');

    // Verificar que las tarjetas de las canciones mockeadas se muestran
    const song1 = page.locator('article', { hasText: 'Pescador de Hombres' });
    const song2 = page.locator('article', { hasText: 'Alabado Sea el Santísimo' });

    await expect(song1).toBeVisible();
    await expect(song1).toContainText('Cesáreo Gabaráin');
    await expect(song1).toContainText('Ton: D');

    await expect(song2).toBeVisible();
    await expect(song2).toContainText('Tradicional');
    await expect(song2).toContainText('Ton: G');
  });

  test('Muestra estado vacío cuando no existen canciones', async ({ page }) => {
    await page.route('**/api/songs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    await expect(page.locator('text=No se encontraron canciones.')).toBeVisible();
  });
});
