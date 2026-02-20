/**
 * يحوّل PsLogo.jpg إلى PNG بأحجام مضبوطة (192 و 512) لأيقونة PWA/الاختصار.
 * Chrome/Windows يطلب أحجاماً مضبوطة حتى يظهر اللوجو على الاختصار.
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const jpgPath = join(publicDir, "PsLogo.jpg");

const SIZES = [192, 512];

try {
  const { Jimp } = await import("jimp");
  const image = await Jimp.read(jpgPath);
  for (const size of SIZES) {
    const resized = image.clone().cover({ w: size, h: size });
    await resized.write(join(publicDir, `PsLogo-${size}.png`));
  }
  await image.write(join(publicDir, "PsLogo.png"));
  console.log("تم إنشاء PsLogo.png و PsLogo-192.png و PsLogo-512.png بنجاح.");
} catch (err) {
  if (err.code === "ENOENT") {
    console.warn("PsLogo.jpg غير موجود في public/. ضع اللوجو هناك ثم شغّل السكربت مرة أخرى.");
  } else {
    console.error(err);
  }
  process.exit(1);
}
