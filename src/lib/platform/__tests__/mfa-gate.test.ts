import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/test/prisma-mock";

const mockAuth = vi.fn();
vi.mock("@/lib/auth/auth", () => ({ auth: mockAuth }));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

const mockGetCurrentSessionToken = vi.fn();
vi.mock("@/lib/security/session-cookie", () => ({
  getCurrentSessionToken: mockGetCurrentSessionToken,
}));

import { requirePlatformAdmin } from "../context";

const loggedInSession = {
  user: { id: "admin_1", platformRole: "SUPER_ADMIN" },
};

describe("requirePlatformAdmin - بوابة 2FA (المرحلة 11)", () => {
  it("لا يُعيد توجيه حسابًا لم يُفعِّل 2FA إطلاقًا (mfaEnabled=false)", async () => {
    mockAuth.mockResolvedValue(loggedInSession);
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ mfaEnabled: false });

    const ctx = await requirePlatformAdmin();

    expect(ctx.userId).toBe("admin_1");
    expect(mockRedirect).not.toHaveBeenCalled();
    // لا داعي حتى لقراءة كوكي الجلسة إن كانت 2FA غير مُفعَّلة أصلاً.
    expect(mockGetCurrentSessionToken).not.toHaveBeenCalled();
  });

  it("يُعيد توجيه حسابًا فعَّل 2FA لكن جلسته الحالية غير مُتحقَّق منها بعد", async () => {
    mockAuth.mockResolvedValue(loggedInSession);
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ mfaEnabled: true });
    mockGetCurrentSessionToken.mockResolvedValue("session_token_abc");
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.session.findUnique.mockResolvedValue({ mfaVerifiedAt: null });

    await requirePlatformAdmin();

    expect(mockRedirect).toHaveBeenCalledWith("/mfa-verify");
  });

  it("لا يُعيد توجيه حسابًا فعَّل 2FA وجلسته الحالية مُتحقَّق منها بالفعل", async () => {
    mockAuth.mockResolvedValue(loggedInSession);
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ mfaEnabled: true });
    mockGetCurrentSessionToken.mockResolvedValue("session_token_abc");
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.session.findUnique.mockResolvedValue({ mfaVerifiedAt: new Date() });

    const ctx = await requirePlatformAdmin();

    expect(ctx.userId).toBe("admin_1");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("skipMfaGate يتجاوز البوابة بالكامل حتى لو كانت 2FA مُفعَّلة وغير مُتحقَّق منها (صفحة /mfa-verify نفسها فقط)", async () => {
    mockAuth.mockResolvedValue(loggedInSession);

    const ctx = await requirePlatformAdmin(undefined, { skipMfaGate: true });

    expect(ctx.userId).toBe("admin_1");
    expect(mockRedirect).not.toHaveBeenCalled();
    // لا يُستعلَم عن mfaEnabled إطلاقًا في هذا المسار - يتجاوز كل المنطق.
    expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
