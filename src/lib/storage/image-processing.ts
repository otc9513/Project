import "server-only";
import sharp from "sharp";
import { InvalidUploadError } from "./object-storage";

const MAX_DIMENSION = 2048;

/**
 * يتحقق من نوع الملف الفعلي من محتواه (لا من اسمه/امتداده - وهذا يمنع
 * رفع ملف تنفيذي مموَّه بامتداد png.exe مثلًا) ثم يُحسّن حجمه ويحدّ من
 * أبعاده القصوى. ملفات SVG تُستثنى من هذه المعالجة (تنسيق متجهي بلا
 * أبعاد بكسل ثابتة)، لكنها تمر عبر تحقق نوع المحتوى فقط.
 */
export async function processUploadedImage(
  buffer: Buffer,
  declaredContentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (declaredContentType === "image/svg+xml") {
    // فحص أساسي: يمنع ملفات SVG تحتوي وسم <script> (متجه هجوم XSS معروف
    // لملفات SVG المرفوعة والمعروضة لاحقًا داخل <img>/<object>).
    const text = buffer.toString("utf-8");
    if (/<script/i.test(text) || /on\w+\s*=/i.test(text)) {
      throw new InvalidUploadError("ملف SVG يحتوي محتوى غير آمن (script/event handlers)");
    }
    return { buffer, contentType: "image/svg+xml" };
  }

  let image: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    image = sharp(buffer);
    metadata = await image.metadata();
  } catch {
    throw new InvalidUploadError("الملف ليس صورة صالحة");
  }

  const detectedFormat = metadata.format; // "png" | "jpeg" | "webp" | ...
  if (!detectedFormat || !["png", "jpeg", "webp"].includes(detectedFormat)) {
    throw new InvalidUploadError("صيغة الصورة الفعلية غير مدعومة");
  }

  const resized = image.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  const output =
    detectedFormat === "png"
      ? await resized.png({ quality: 90, compressionLevel: 9 }).toBuffer()
      : detectedFormat === "webp"
        ? await resized.webp({ quality: 90 }).toBuffer()
        : await resized.jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  return { buffer: output, contentType: `image/${detectedFormat}` };
}
