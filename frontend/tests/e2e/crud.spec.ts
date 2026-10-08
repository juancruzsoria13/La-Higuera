import { test, expect } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
loadEnvConfig(process.cwd());
const enabled = process.env.ALLOW_INTEGRATION_TESTS === "true" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
test("CRUD real, recarga, privacidad con dos usuarios y eliminación de cuenta", async ({page,browser,baseURL}) => {
  test.skip(!enabled, "Requiere Supabase de prueba configurado y ALLOW_INTEGRATION_TESTS=true.");
  test.setTimeout(120000);
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const users: {id:string; email:string; password:string}[] = [];
  const otherContext = await browser.newContext(); const other = await otherContext.newPage();
  try {
    for (const name of ["Ana prueba", "Bruno prueba"]) {
      const email = `higuera-e2e-${randomUUID()}@example.com`; const password = `Pass!${randomUUID()}`;
      const {data,error} = await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name}});
      expect(error).toBeNull(); users.push({id:data.user!.id,email,password});
    }
    for (const [i, target] of [page,other].entries()) {
      await target.goto(`${baseURL}/ingresar`);
      await target.getByLabel("Correo electrónico").fill(users[i].email);
      await target.getByLabel("Contraseña").fill(users[i].password);
      await target.getByRole("button",{name:"Ingresar",exact:true}).click();
      await expect(target).toHaveURL(/mis-productos/);
    }
    await page.goto("/mi-perfil"); await page.getByLabel("Localidad",{exact:true}).selectOption("rivadavia"); await page.getByRole("button",{name:"Guardar perfil"}).click(); await expect(page.getByRole("status")).toContainText("se guardó"); await page.reload(); await expect(page.getByLabel("Localidad",{exact:true})).toHaveValue("rivadavia");
    await page.goto("/productos/nuevo");
    await page.getByLabel("Título del anuncio").fill("Bicicleta de integración");
    await page.getByLabel("Descripción").fill("Una bicicleta de prueba para verificar la persistencia.");
    await page.getByLabel("Precio",{exact:true}).fill("15000,50");
    await expect(page.getByLabel("Localidad",{exact:true})).toHaveValue("rivadavia");
    await page.getByLabel("Teléfono / WhatsApp").fill("2644123456");
    const photo = (background: string) => sharp({create:{width:32,height:32,channels:3,background}}).png().toBuffer();
    await page.getByLabel("Agregar fotos").setInputFiles([{name:"verde.png",mimeType:"image/png",buffer:await photo("green")},{name:"azul.png",mimeType:"image/png",buffer:await photo("blue")}]);
    await page.getByRole("button",{name:"Mover la foto 2 antes"}).click();
    await page.getByRole("button",{name:"Publicar anuncio"}).click();
    await expect(page).toHaveURL(/productos\/[0-9a-f-]+\?guardado/); const productUrl = page.url().split("?")[0];
    await page.reload(); await expect(page.getByRole("heading",{name:"Bicicleta de integración"})).toBeVisible();
    await expect(page.getByRole("button",{name:/Ver foto \d de 2/})).toHaveCount(2); await expect(page.getByRole("link",{name:"WhatsApp"})).toHaveAttribute("href","https://wa.me/2644123456");
    const imageUrl = await page.getByRole("img",{name:"Bicicleta de integración"}).getAttribute("src");
    await other.goto(productUrl); await expect(other.getByRole("heading",{name:"Bicicleta de integración"})).toBeVisible(); await expect(other.getByRole("link",{name:"Editar anuncio"})).toHaveCount(0); await expect(other.getByText(users[0].email)).toHaveCount(0);
    await other.goto(`${productUrl}/editar`); await expect(other.getByRole("heading",{name:"Este anuncio no está disponible"})).toBeVisible();
    await page.getByRole("link",{name:"Editar anuncio"}).click(); await page.getByLabel("Estado del anuncio").selectOption("pausado"); await page.getByRole("button",{name:"Guardar cambios"}).click(); await expect(page).toHaveURL(/guardado/);
    await other.goto(productUrl); await expect(other.getByRole("heading",{name:"Este anuncio no está disponible"})).toBeVisible(); expect((await other.request.get(`${baseURL}${imageUrl}`)).status()).toBe(404);
    // Delete through the actual server action; identity comes from the signed session.
    await page.goto("/mi-perfil"); await page.getByRole("button",{name:"Eliminar mi cuenta",exact:true}).click(); await page.getByLabel("Escribí ELIMINAR para confirmar").fill("ELIMINAR"); await page.getByRole("button",{name:"Eliminar definitivamente"}).click(); await expect(page).toHaveURL(/cuenta=eliminada/);
    expect((await admin.from("products").select("id").eq("owner_id",users[0].id)).data).toEqual([]);
    expect((await admin.auth.admin.getUserById(users[0].id)).error).not.toBeNull(); users.shift();
  } finally {
    await otherContext.close();
    for (const user of users) {
      for (;;) {const {data} = await admin.storage.from("product-images").list(user.id,{limit:100}); if (!data?.length) break; const {error} = await admin.storage.from("product-images").remove(data.map(f => `${user.id}/${f.name}`)); if (error) throw error;}
      const {error} = await admin.auth.admin.deleteUser(user.id); if (error) throw error;
      await admin.from("storage_cleanup").delete().eq("owner_id",user.id);
    }
  }
});
