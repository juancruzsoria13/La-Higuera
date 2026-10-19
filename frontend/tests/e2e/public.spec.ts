import { test, expect } from "@playwright/test";
test("inicio, búsqueda y categorías funcionan sin datos inventados", async ({page}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {name: /Conseguí tu electricista/})).toBeVisible();
  await expect(page.getByRole("button", {name: "Pausar carrusel"})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("inicio.png"), fullPage: true, animations: "disabled"});
  const search = page.getByRole("textbox", {name: "Qué buscás"});
  await search.fill("bicicleta");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/q=bicicleta/);
  // Categorías abre el menú en Servicios; la pestaña Artículos lista el resto de los rubros. Escape cierra y devuelve el foco.
  const menuButton = page.getByRole("button", {name: "Categorías", exact: true});
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("tab", {name: "Servicios"})).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", {name: "Artículos"}).click();
  await expect(page.getByRole("navigation", {name: "Categorías de artículos"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();
  const term = "bicicleta";
  await menuButton.click();
  await page.getByRole("tab", {name: "Artículos"}).click();
  const articles = page.getByRole("navigation", {name: "Categorías de artículos"});
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
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
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


test("barra de categorías, búsqueda conservada y tiendas sin enlace", async ({page}, testInfo) => {
  await page.goto("/");
  const sections = page.getByRole("navigation", {name: "Secciones", exact: true});
  await expect(sections.locator("a, button")).toHaveText(["Categorías", "Servicios", "Inmuebles", "Vehículos", /Tiendas Virtuales/, "Ayuda"]);
  const menuButton = sections.getByRole("button", {name: "Categorías", exact: true});
  await menuButton.click();
  // Servicios tiene prioridad: es la pestaña con la que abre el menú.
  await expect(page.getByRole("tab", {name: "Servicios"})).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", {name: "Inmuebles"}).click();
  const menu = page.getByRole("navigation", {name: "Subcategorías de inmuebles", exact: true});
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(8);
  await menu.getByRole("link", {name: "Casas", exact: true}).click();
  await expect(page).toHaveURL(/category=inmuebles&subcategory=casas/);
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole("heading", {name: "Casas", exact: true})).toBeVisible();
  await page.getByRole("textbox", {name: "Qué buscás"}).fill("patio");
  await page.getByRole("button", {name: "Buscar", exact: true}).click();
  await expect(page).toHaveURL(/subcategory=casas/);
  await expect(page).toHaveURL(/q=patio/);
  await expect(page.getByRole("heading", {name: "Resultados para “patio”", exact: true})).toBeVisible();
  // Con un rubro elegido el menú abre en su pestaña, y las flechas recorren las pestañas.
  await menuButton.click();
  const houseTab = page.getByRole("tab", {name: "Inmuebles"});
  await expect(houseTab).toHaveAttribute("aria-selected", "true");
  await houseTab.press("ArrowDown");
  await expect(page.getByRole("tab", {name: "Vehículos"})).toBeFocused();
  const vehicleMenu = page.getByRole("navigation", {name: "Subcategorías de vehículos", exact: true});
  await expect(vehicleMenu).toBeVisible();
  await expect(vehicleMenu.getByRole("link")).toHaveCount(8);
  await expect(vehicleMenu.getByRole("link", {name: "Bicicletas", exact: true})).toHaveAttribute("href", "/?q=patio&category=vehiculos&subcategory=bicicletas");
  await page.screenshot({path: testInfo.outputPath("barra-categorias.png"), fullPage: false, animations: "disabled"});
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();
  await menuButton.press("Enter");
  await expect(page.getByRole("tabpanel")).toBeVisible();
  // Un click fuera del menú lo cierra (el buscador queda arriba del menú también en mobile).
  await page.getByRole("textbox", {name: "Qué buscás"}).click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  const houses = sections.getByRole("link", {name: "Inmuebles", exact: true});
  await houses.click();
  await expect(page).toHaveURL(/q=patio&category=inmuebles/);
  await expect(page).not.toHaveURL(/subcategory=/);
  await expect(houses).toHaveAttribute("aria-current", "page");
  await sections.getByRole("link", {name: "Vehículos", exact: true}).click();
  await expect(page).toHaveURL(/q=patio&category=vehiculos/);
  const services = sections.getByRole("link", {name: "Servicios", exact: true});
  await menuButton.click();
  await page.getByRole("tab", {name: "Servicios"}).click();
  const serviceMenu = page.getByRole("navigation", {name: "Oficios disponibles", exact: true});
  await expect(serviceMenu).toBeVisible();
  await expect(serviceMenu.getByRole("link", {name: "Ver todos los servicios", exact: true})).toHaveAttribute("href", "/servicios");
  await expect(page.getByRole("link", {name: /Sumá tu perfil/})).toHaveAttribute("href", "/servicios/nuevo");
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
  await expect(services).toHaveAttribute("aria-current", "page");
  const stores = sections.getByRole("button", {name: /Tiendas Virtuales/});
  await expect(stores).toHaveAttribute("aria-disabled", "true");
  await expect(stores).not.toHaveAttribute("href");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
