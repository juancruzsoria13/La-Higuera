import sharp from "sharp";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export async function normalizeImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera el límite de 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Usá una imagen JPG, PNG o WebP.");
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const decoder = sharp(buffer, {limitInputPixels: 20_000_000, failOn: "warning"});
    const metadata = await decoder.metadata();
    const types: Record<string, string> = {jpeg: "image/jpeg", png: "image/png", webp: "image/webp"};
    if (!metadata.format || types[metadata.format] !== file.type || (metadata.pages ?? 1) > 1) throw new Error();
    const output = await decoder.rotate().resize(1600, 1600, {fit: "inside", withoutEnlargement: true}).webp({quality: 82}).toBuffer();
    if (output.length > MAX_IMAGE_BYTES) throw new Error();
    return output;
  } catch {
    throw new Error("No pudimos leer esa imagen. Usá un JPG, PNG o WebP válido, sin animación y de hasta 20 megapíxeles.");
  }
}
