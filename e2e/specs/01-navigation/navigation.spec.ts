import { test, expect } from '@playwright/test';

test.describe('Navegación y Layout General', () => {
  test('La página principal carga correctamente con su título y estructura básica', async ({ page }) => {
    await page.goto('/');

    // Verificar título de la página
    await expect(page).toHaveTitle(/Cancionero/i);

    // Verificar presencia del logo en el header
    const logoLink = page.locator('#header-logo a');
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute('href', '/');
  });

  test('Comportamiento de navegación en Desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Prueba exclusiva para vista de escritorio');

    await page.goto('/');

    // Header visible y con barra de búsqueda
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // En Desktop, el BottomNav debe estar oculto
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeHidden();
  });

  test('Comportamiento de navegación en Móvil', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Prueba exclusiva para vista móvil');

    await page.goto('/');

    // En móvil, la barra de navegación inferior fija debe ser visible
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible();

    // Verificar enlaces clave de la barra móvil
    const inicioLink = bottomNav.getByRole('link', { name: /inicio/i });
    await expect(inicioLink).toBeVisible();
    await expect(inicioLink).toHaveAttribute('href', '/');

    const misasLink = bottomNav.getByRole('link', { name: /misas/i });
    await expect(misasLink).toBeVisible();
    await expect(misasLink).toHaveAttribute('href', '/misas');

    const ministeriosLink = bottomNav.getByRole('link', { name: /ministerios/i });
    await expect(ministeriosLink).toBeVisible();
    await expect(ministeriosLink).toHaveAttribute('href', '/ministerios');
  });

  test('Ruta inexistente muestra la página 404', async ({ page }) => {
    const response = await page.goto('/ruta-que-definitivamente-no-existe-12345');
    // En Astro SSR puede retornar 404
    expect([200, 404]).toContain(response?.status() ?? 0);

    // Debe contener el mensaje o texto característico de 404
    await expect(page.locator('body')).toContainText(/404|no encontrada|no existe/i);
  });
});
