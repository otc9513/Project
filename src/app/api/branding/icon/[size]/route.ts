import "server-only";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const ALLOWED_SIZES = new Set([192, 512]);

// نُخزّن نتيجة كل تحويل (مقاس × maskable) في الذاكرة داخل نفس عملية
// الخادم لتفادي تنزيل الشعار من التخزين وإعادة معالجته بـ sharp عند كل
// طلب أيقونة - المانيفست يطلب 4 أيقونات دفعة واحدة عند كل تثبيت/فتح.
// هذا Cache بسيط لعملية واحدة فقط (Serverless) وليس بديلاً عن CDN حقيقي؛
// نعتمد أيضًا على رأس Cache-Control أدناه ليقوم المتصفح/الـ CDN بالباقي.
const memoryCache = new Map<string, { buffer: Buffer; sourceUrl: string }>();

/**
 * GET /api/branding/icon/192?maskable=1
 *
 * يولّد أيقونة PWA بالمقاس المطلوب من الشعار الأصلي (PWA_ICON) المرفوع
 * عبر لوحة Super Admin، بدل تخزين نسخ مكرَّرة بكل مقاس مسبقًا في
 * التخزين السحابي (وفق تعليمات البرومبت: "لا تُخزّن أصولًا أصلية ضخمة
 * مكررة إن كانت البنية الحالية تدعم التحويل" - وهي تدعمه فعليًا عبر sharp
 * المستخدَم أصلاً في processUploadedImage).
 *
 * maskable=1: يضيف هامشًا آمنًا (نسبيًا للمقاس) حول الشعار بخلفية بيضاء
 * ثابتة، لأن أيقونات "maskable" في Android تُقصّ إلى دائرة/مربع مستدير
 * وقد تُقصّ حواف الشعار إن مُلئ الإطار بالكامل - المعيار الشائع هامش
 * أمان لا يقل عن 10% من كل جهة (نستخدم ~13% هنا كهامش مريح).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED_SIZES.has(size)) {
    return NextResponse.json({ error: "مقاس غير مدعوم" }, { status: 400 });
  }

  const maskable = new URL(request.url).searchParams.get("maskable") === "1";

  const asset = await prisma.brandAsset.findUnique({ where: { type: "PWA_ICON" } });

  // لا شعار مخصَّص مرفوع بعد: نُعيد توجيه المتصفح للأيقونة الثابتة
  // الافتراضية بدل خطأ - هذا هو "السقوط الآمن للبراندنغ الافتراضي" الذي
  // يطلبه البرومبت صراحةً.
  if (!asset) {
    const fallbackPath = maskable
      ? `/icons/icon-maskable-${size}.png`
      : `/icons/icon-${size}.png`;
    return NextResponse.redirect(new URL(fallbackPath, request.url));
  }

  const cacheKey = `${asset.url}:${size}:${maskable ? "maskable" : "any"}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.sourceUrl === asset.url) {
    return respondWithPng(cached.buffer);
  }

  let sourceBuffer: Buffer;
  try {
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`فشل تنزيل الشعار: ${res.status}`);
    sourceBuffer = Buffer.from(await res.arrayBuffer());
  } catch {
    // فشل الجلب من التخزين (شبكة/إعدادات) لا يجب أن يكسر تثبيت PWA -
    // سقوط آمن إضافي للأيقونة الافتراضية.
    const fallbackPath = maskable
      ? `/icons/icon-maskable-${size}.png`
      : `/icons/icon-${size}.png`;
    return NextResponse.redirect(new URL(fallbackPath, request.url));
  }

  try {
    const output = maskable
      ? await buildMaskableIcon(sourceBuffer, size)
      : await sharp(sourceBuffer)
          .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toBuffer();

    memoryCache.set(cacheKey, { buffer: output, sourceUrl: asset.url });
    return respondWithPng(output);
  } catch {
    return NextResponse.json({ error: "تعذّرت معالجة الشعار" }, { status: 500 });
  }
}

async function buildMaskableIcon(sourceBuffer: Buffer, size: number): Promise<Buffer> {
  const safeZoneRatio = 0.74; // هامش أمان ~13% من كل جهة (74% للمحتوى في المنتصف)
  const innerSize = Math.round(size * safeZoneRatio);

  const inner = await sharp(sourceBuffer)
    .resize(innerSize, innerSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

function respondWithPng(buffer: Buffer) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // ساعة واحدة على CDN/المتصفح - كافية لتفادي إعادة المعالجة المتكررة
      // مع عدم تجميد شعار قديم طويلاً بعد تحديثه من لوحة Super Admin.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
