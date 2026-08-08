import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { prisma } from "@/lib/prisma";
import { reportService } from "@/features/reports/service/report.service";
import { generatePdfReport } from "@/features/reports/lib/pdf-export";

/**
 * لماذا Route Handler وليس Server Action هنا (خلافًا لبقية التطبيق)؟
 * Server Actions مصمّمة لإرجاع بيانات JSON قابلة للتسلسل إلى المكوّن الذي
 * استدعاها، وليس لبثّ ملف ثنائي (Binary) بترويسات تحميل (Content-Disposition).
 * كل الحماية (المستأجر/الدور/الميزة) لا تزال منفَّذة داخل reportService
 * نفسه، فهذا المسار ليس "API عام مكشوف" - هو محمي بنفس الحراسة تمامًا.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContext();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "المعاملان from و to إلزاميان" }, { status: 400 });
    }

    const [report, tenant] = await Promise.all([
      reportService.fullReport({ from: new Date(from), to: new Date(to) }),
      prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId }, select: { name: true } }),
    ]);

    const pdfBytes = await generatePdfReport(report, tenant.name);

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${from}-to-${to}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر إنشاء التقرير";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
