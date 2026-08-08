import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.plan.upsert({
    where: { name: "Basic" },
    update: {},
    create: {
      name: "Basic",
      nameAr: "أساسية",
      priceMonthly: 0,
      priceYearly: 0,
      trialDays: 0,
      sortOrder: 1,
      maxGenerators: 1,
      maxSubscribers: 100,
      maxEmployees: 2,
      features: { billing: true, reports: false, ai: false, pwaOffline: false },
    },
  });

  await prisma.plan.upsert({
    where: { name: "Professional" },
    update: {},
    create: {
      name: "Professional",
      nameAr: "احترافية",
      priceMonthly: 25000,
      priceYearly: 250000, // شهران مجانًا تقريبًا عند الدفع السنوي
      trialDays: 14,
      sortOrder: 2,
      maxGenerators: 5,
      maxSubscribers: 1000,
      maxEmployees: 10,
      features: { billing: true, reports: true, ai: false, pwaOffline: true },
    },
  });

  await prisma.plan.upsert({
    where: { name: "Enterprise" },
    update: {},
    create: {
      name: "Enterprise",
      nameAr: "مؤسسية",
      priceMonthly: 75000,
      priceYearly: 750000,
      trialDays: 14,
      sortOrder: 3,
      maxGenerators: null,
      maxSubscribers: null,
      maxEmployees: null,
      features: { billing: true, reports: true, ai: true, pwaOffline: true },
    },
  });

  // بذرة Super Admin أولى (المرحلة 8): لا يوجد أي طريق آخر لمنح أول
  // صلاحية Super Admin في منصة جديدة تمامًا - تسجيل الدخول عبر Google فقط،
  // فلا "أول مستخدم يصبح مسؤولاً" تلقائيًا كما في بعض الأنظمة (ذلك كان
  // سيفتح ثغرة استيلاء حساب لأي بريد يسجّل دخوله أولاً على بيئة إنتاج).
  // بدلاً من ذلك: يضبط فريق التشغيل SEED_SUPER_ADMIN_EMAIL في `.env` قبل
  // أول تشغيل لـ seed، فتُنشأ دعوة يستهلكها ذلك البريد تلقائيًا عند أول
  // تسجيل دخول له عبر consumePlatformAdminInvite في lib/tenant/onboarding.ts.
  const bootstrapEmail = process.env.SEED_SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  if (bootstrapEmail) {
    await prisma.platformAdminInvite.upsert({
      where: { email: bootstrapEmail },
      update: {},
      create: { email: bootstrapEmail, role: "SUPER_ADMIN", invitedById: "seed" },
    });
    console.log(`✅ دعوة Super Admin أولى جاهزة لـ ${bootstrapEmail}`);
  } else {
    console.warn(
      "⚠️ لم يُضبَط SEED_SUPER_ADMIN_EMAIL - لن يستطيع أي أحد الوصول للوحة Super Admin حتى تُنشئ دعوة يدويًا عبر Prisma Studio"
    );
  }

  console.log("✅ تم زرع البيانات الأساسية (الخطط + إعدادات المنصة)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
