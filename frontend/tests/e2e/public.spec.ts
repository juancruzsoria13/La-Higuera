import { test, expect, type Locator } from "@playwright/test";
/** Abre el menú ☰ del celular. Reintenta porque, tras una recarga, un toque antes de que hidrate React no hace nada. */
async function openSheet(button: Locator) {
  const sheet = button.page().getByRole("dialog", {name: "Categorías"});
  await expect(async () => {
    if (!await sheet.isVisible()) await button.click();
    await expect(sheet).toBeVisible({timeout: 1000});
  }).toPass();
  return sheet;
}
test("inicio, búsqueda y categorías funcionan sin datos inventados", async ({page, isMobile}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {name: /Conseguí tu electricista/})).toBeVisible();
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("inicio.png"), fullPage: true, animations: "disabled"});
  const search = page.getByRole("textbox", {name: "Qué buscás"});
  await search.fill("bicicleta");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/q=bicicleta/);
  // Artículos abre las categorías restantes (en el celular, dentro del menú ☰); Escape cierra y devuelve el foco.
  const menuButton = page.getByRole("button", {name: "Abrir menú de categorías", exact: true});
  const ads = page.getByRole("button", {name: "Artículos", exact: true});
  const articles = page.getByRole("navigation", {name: "Categorías de artículos"});
  if (isMobile) await openSheet(menuButton);
  await ads.click();
  await expect(ads).toHaveAttribute("aria-expanded", "true");
  await expect(articles).toBeVisible();
  await page.keyboard.press("Escape");
  if (isMobile) {
    await expect(page.getByRole("dialog", {name: "Categorías"})).toBeHidden();
    await expect(menuButton).toBeFocused();
    await openSheet(menuButton);
  } else {
    await expect(ads).toHaveAttribute("aria-expanded", "false");
    await expect(ads).toBeFocused();
  }
  const term = "bicicleta";
  await ads.click();
  for (const name of ["Tecnología", "Ropa", "Muebles", "Electrodomésticos", "Materiales de construcción", "Otros"]) {
    await expect(articles.getByRole("link", {name, exact: true})).toBeVisible();
  }
  const furniture = articles.getByRole("link", {name: "Muebles", exact: true});
  await furniture.click();
  await expect(page).toHaveURL(/category=muebles/);
  await expect(search).toHaveValue(term);
  await search.fill("mesa");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/category=muebles/);
  await expect(page).toHaveURL(/q=mesa/);
  await page.getByRole("link", {name: "La Higuera, inicio", exact: true}).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(search).toHaveValue("");
  if (!isMobile) await expect(ads).toHaveAttribute("aria-expanded", "false");
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowing).toBe(false);
});
test("vidriera: rubros y servicios antes que los anuncios; con filtros, solo resultados", async ({page}) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", {name: "Rubros", exact: true});
  await expect(shortcuts.getByRole("link").first()).toHaveText("Servicios");
  await expect(shortcuts.getByRole("link").first()).toHaveAttribute("href", "/servicios");
  const services = page.getByRole("heading", {name: "Profesionales de oficio en San Juan"});
  const listing = page.getByRole("heading", {name: "Recién publicado en San Juan"});
  await expect(services).toBeVisible();
  expect((await services.boundingBox())!.y).toBeLessThan((await listing.boundingBox())!.y);
  await shortcuts.getByRole("link", {name: "Muebles", exact: true}).click();
  await expect(page).toHaveURL(/category=muebles/);
  await expect(page.getByRole("heading", {name: "Muebles", exact: true, level: 2})).toBeVisible();
  await expect(shortcuts).toHaveCount(0);
  await expect(services).toHaveCount(0);
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toHaveCount(0);
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
  await expect(page.getByRole("heading", {name: /Vendé lo que ya no usás/})).toBeVisible();
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
  await expect(page.getByRole("heading", {name: /Vendé lo que ya no usás/})).toBeVisible();
});
test("publicar requiere sesión y una URL inexistente no revela datos", async ({page}) => {
  await page.goto("/productos/nuevo");
  await expect(page).toHaveURL(/ingresar/);
  await expect(page.getByRole("heading", {name: "Qué bueno verte de nuevo"})).toBeVisible();
  await page.goto("/productos/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", {name: "Este anuncio no está disponible"})).toBeVisible();
});


test("la barra marca una sección solo si hay un rubro elegido", async ({page, isMobile}) => {
  test.skip(isMobile, "En el celular la barra se reemplaza por el menú ☰.");
  await page.goto("/");
  const sections = page.getByRole("navigation", {name: "Secciones", exact: true});
  await expect(sections.getByRole("link", {name: "Inmuebles", exact: true})).toBeVisible();
  await expect(sections.locator("[data-active='true']")).toHaveCount(0);
  await page.goto("/?category=tecnologia");
  await expect(sections.getByRole("button", {name: "Artículos", exact: true})).toHaveAttribute("data-active", "true");
});
test("barra con subcategorías, búsqueda conservada y tiendas sin enlace", async ({page, isMobile}, testInfo) => {
  test.skip(isMobile, "En el celular la barra se reemplaza por el menú ☰.");
  await page.goto("/");
  const sections = page.getByRole("navigation", {name: "Secciones", exact: true});
  await expect(sections.locator("a, button:not(.hdr-tab-toggle)")).toHaveText(["Inmuebles", "Vehículos", "Artículos", "Servicios", "Tiendas Virtuales Pronto", "Ayuda"]);
  const houses = sections.getByRole("link", {name: "Inmuebles", exact: true});
  await houses.hover();
  const menu = page.getByRole("navigation", {name: "Subcategorías de inmuebles", exact: true});
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(8);
  await menu.getByRole("link", {name: "Casas", exact: true}).click();
  await expect(page).toHaveURL(/category=inmuebles&subcategory=casas/);
  await expect(page.getByRole("heading", {name: "Casas", exact: true})).toBeVisible();
  await page.getByRole("textbox", {name: "Qué buscás"}).fill("patio");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/subcategory=casas/);
  await expect(page).toHaveURL(/q=patio/);
  await expect(page.getByRole("heading", {name: "Resultados para “patio”", exact: true})).toBeVisible();
  const vehicles = sections.getByRole("link", {name: "Vehículos", exact: true});
  const vehicleToggle = sections.getByRole("button", {name: "Mostrar subcategorías de vehículos", exact: true});
  await vehicles.hover();
  const vehicleMenu = page.getByRole("navigation", {name: "Subcategorías de vehículos", exact: true});
  await expect(vehicleMenu).toBeVisible();
  await expect(vehicleMenu.getByRole("link")).toHaveCount(8);
  await expect(vehicleMenu.getByRole("link", {name: "Bicicletas", exact: true})).toHaveAttribute("href", "/?q=patio&category=vehiculos&subcategory=bicicletas");
  await page.screenshot({path: testInfo.outputPath("barra-subcategorias.png"), fullPage: false, animations: "disabled"});
  await page.keyboard.press("Escape");
  await expect(vehicleToggle).toHaveAttribute("aria-expanded", "false");
  await expect(vehicleToggle).toBeFocused();
  await vehicleToggle.press("Enter");
  await expect(vehicleMenu).toBeVisible();
  // Un click fuera del menú lo cierra. Sin carrusel, el título de resultados queda debajo del menú: se usa el buscador, que está arriba.
  await page.getByRole("textbox", {name: "Qué buscás"}).click();
  await expect(vehicleToggle).toHaveAttribute("aria-expanded", "false");
  await houses.click();
  await expect(page).toHaveURL(/q=patio&category=inmuebles/);
  await expect(page).not.toHaveURL(/subcategory=/);
  await vehicles.click();
  await expect(page).toHaveURL(/q=patio&category=vehiculos/);
  await expect(vehicleMenu).not.toBeVisible();
  const services = sections.getByRole("link", {name: "Servicios", exact: true});
  await services.hover();
  const serviceMenu = page.getByRole("navigation", {name: "Oficios disponibles", exact: true});
  await expect(serviceMenu).toBeVisible();
  await expect(serviceMenu.getByRole("link", {name: "Ver todos los servicios", exact: true})).toHaveAttribute("href", "/servicios");
  const tradeLinks = serviceMenu.getByRole("link");
  if (await tradeLinks.count() > 1) {
    const trade = tradeLinks.nth(1);
    const tradeName = await trade.innerText();
    const tradeHref = await trade.getAttribute("href");
    await trade.click();
    await expect(page).toHaveURL(new RegExp(tradeHref!.replace("?", "\\?")));
    await expect(page.getByRole("heading", {name: tradeName, exact: true})).toBeVisible();
  }
  await services.click();
  await expect(page).toHaveURL(/\/servicios$/);
  await expect(serviceMenu).not.toBeVisible();
  const stores = sections.getByRole("button", {name: "Tiendas Virtuales Pronto", exact: true});
  await expect(stores).toHaveAttribute("aria-disabled", "true");
  await expect(stores).not.toHaveAttribute("href");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
test("en el celular, el menú ☰ reemplaza la barra de secciones", async ({page, isMobile}) => {
  test.skip(!isMobile, "El menú ☰ solo aparece por debajo de 1024px.");
  await page.goto("/");
  await expect(page.getByRole("navigation", {name: "Secciones", exact: true})).toBeHidden();
  const menuButton = page.getByRole("button", {name: "Abrir menú de categorías", exact: true});
  const sheet = await openSheet(menuButton);
  for (const name of ["Inmuebles", "Vehículos", "Artículos", "Servicios"]) await expect(sheet.getByRole("button", {name, exact: true})).toHaveAttribute("aria-expanded", "false");
  await expect(sheet.getByRole("button", {name: "Tiendas Virtuales Pronto", exact: true})).toHaveAttribute("aria-disabled", "true");
  await expect(sheet.getByRole("link", {name: "Ayuda", exact: true})).toHaveAttribute("href", "/ayuda");
  await sheet.getByRole("button", {name: "Inmuebles", exact: true}).click();
  const houses = sheet.getByRole("navigation", {name: "Subcategorías de inmuebles", exact: true});
  await expect(houses.getByRole("link")).toHaveCount(8);
  await houses.getByRole("link", {name: "Casas", exact: true}).click();
  await expect(page).toHaveURL(/category=inmuebles&subcategory=casas/);
  await expect(sheet).toBeHidden();
  // Escape cierra y devuelve el foco al botón; tocar fuera del panel también cierra. Al volver a abrir, las secciones arrancan cerradas.
  await openSheet(menuButton);
  await expect(sheet.getByRole("button", {name: "Inmuebles", exact: true})).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(menuButton).toBeFocused();
  await openSheet(menuButton);
  const viewport = page.viewportSize()!;
  await page.touchscreen.tap(viewport.width - 10, viewport.height / 2);
  await expect(sheet).toBeHidden();
  await openSheet(menuButton);
  await sheet.getByRole("button", {name: "Servicios", exact: true}).click();
  await expect(sheet.getByRole("navigation", {name: "Oficios disponibles", exact: true}).getByRole("link", {name: "Ver todos los servicios", exact: true})).toHaveAttribute("href", "/servicios");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
test("ofertas: van antes que servicios si hay, y tienen su listado sin portada", async ({page}) => {
  await page.goto("/");
  const offers = page.getByRole("heading", {name: "Ofertas en San Juan"});
  const services = page.getByRole("heading", {name: "Profesionales de oficio en San Juan"});
  await expect(services).toBeVisible();
  // Sin ofertas (por ejemplo, sin Supabase) la franja no aparece y Servicios queda primero.
  if (await offers.count()) {
    expect((await offers.boundingBox())!.y).toBeLessThan((await services.boundingBox())!.y);
    await page.getByRole("link", {name: "Ver todas las ofertas"}).click();
    await expect(page).toHaveURL(/ofertas=1/);
  } else await page.goto("/?ofertas=1");
  await expect(page.getByRole("heading", {name: "Ofertas", exact: true, level: 2})).toBeVisible();
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toHaveCount(0);
  await expect(services).toHaveCount(0);
});
