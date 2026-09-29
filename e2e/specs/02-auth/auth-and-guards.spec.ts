import { test, expect } from '@playwright/test';

test.describe('Autenticación y Protección de Rutas (Route Guards)', () => {
  test('Rutas protegidas redirigen a /login si no hay sesión activa', async ({ page }) => {
    // Intentar acceder a perfil sin cookie de sesión
    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/login/);

    // Intentar acceder a crear canción sin sesión
    await page.goto('/songs/add');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Página de login contiene el formulario completo y enlaces esperados', async ({ page }) => {
    await page.goto('/login');

    // Verificar título y cabecera
    await expect(page.locator('h1')).toContainText(/iniciar sesión/i);

    // Campos del formulario
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.locator('#submitBtn');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Botón de Google OAuth y enlace a registro
    await expect(page.getByRole('link', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /regístrate/i })).toHaveAttribute('href', '/register');
  });

  test('Muestra alerta de error ante credenciales inválidas', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('usuario_no_existente@cancionero.online');
    await page.locator('#password').fill('claveIncorrecta123');
    await page.locator('#submitBtn').click();

    // Verificar que SweetAlert2 muestra el popup de error
    const swalModal = page.locator('.swal2-popup');
    await expect(swalModal).toBeVisible({ timeout: 10000 });
    await expect(swalModal).toContainText(/error/i);
  });
});
