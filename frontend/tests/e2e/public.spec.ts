import { test, expect } from "@playwright/test";
test("inicio, búsqueda y categorías funcionan sin datos inventados", async ({page}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {name: /Lo que buscás/})).toBeVisible();
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("inicio.png"), fullPage: true, animations: "disabled"});
  const search = page.getByRole("textbox", {name: "Qué buscás"});
  await search.fill("bicicleta");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/q=bicicleta/);
  // "Anuncios" abre el menú de rubros; Escape lo cierra y devuelve el foco al botón.
  const ads = page.getByRole("button", {name: "Anuncios"});
  await ads.click();
  await expect(ads).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", {name: "Rubros"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ads).toHaveAttribute("aria-expanded", "false");
  await expect(ads).toBeFocused();
  const term = "bicicleta";
  await ads.click();
  for (const name of ["Inmuebles", "Tecnología", "Vehículos", "Ropa", "Muebles", "Electrodomésticos", "Materiales de construcción", "Otros"]) {
    await expect(page.getByRole("link", {name, exact: true})).toBeVisible();
  }
  const furniture = page.getByRole("link", {name: "Muebles", exact: true});
  await furniture.click();
  await expect(page).toHaveURL(/category=muebles/);
  await expect(search).toHaveValue(term);
  await search.fill("mesa");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/category=muebles/);
  await expect(page).toHaveURL(/q=mesa/);
  await ads.click();
  await page.getByRole("link", {name: "Todos los anuncios", exact: true}).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(search).toHaveValue("mesa");
  await expect(ads).toHaveAttribute("aria-expanded", "false");
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowing).toBe(false);
});
test("carrusel automático, pausa y navegación manual", async ({page}, testInfo) => {
  await page.clock.install();
  await page.goto("/");
  const first = page.getByRole("button", {name: "Mostrar mensaje 1"});
  const second = page.getByRole("button", {name: "Mostrar mensaje 2"});
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toBeVisible();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(6500);
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", {name: "Pausar carrusel"}).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(13000);
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", {name: "Mensaje siguiente"}).click();
  await expect(page.getByRole("heading", {name: /Tu próximo hallazgo/})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("carrusel-mensaje-3.png"), fullPage: true, animations: "disabled"});
  await page.getByRole("button", {name: "Mensaje siguiente"}).press("ArrowRight");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", {name: "Reanudar carrusel"}).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(6500);
  await expect(second).toHaveAttribute("aria-pressed", "true");
});
test("el carrusel respeta la preferencia de movimiento reducido", async ({page}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.clock.install();
  await page.goto("/");
  await page.clock.fastForward(20000);
  await expect(page.getByRole("button", {name: "Mostrar mensaje 1"})).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", {name: "Mostrar mensaje 3"}).click();
  await expect(page.getByRole("heading", {name: /Tu próximo hallazgo/})).toBeVisible();
});
test("publicar requiere sesión y una URL inexistente no revela datos", async ({page}) => {
  await page.goto("/productos/nuevo");
  await expect(page).toHaveURL(/ingresar/);
  await expect(page.getByRole("heading", {name: "Qué bueno verte de nuevo"})).toBeVisible();
  await page.goto("/productos/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", {name: "Este anuncio no está disponible"})).toBeVisible();
});
