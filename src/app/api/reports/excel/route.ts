import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant/context";
import { prisma } from "@/lib/prisma";
import { reportService } from "@/features/reports/service/report.service";
import { generateExcelReport } from "@/features/reports/lib/excel-export";

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

    const buffer = await generateExcelReport(report, tenant.name);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-${from}-to-${to}.xlsx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر إنشاء التقرير";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
