import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import {
  createTenantForNewUser,
  consumePlatformAdminInvite,
} from "@/lib/tenant/onboarding";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    /**
     * أول تسجيل دخول لمستخدم جديد عبر Google:
     * ننشئ مساحة عمل (Tenant) خاصة به تلقائيًا ونجعله OWNER فيها.
     * وفق المتطلبات: "أول تسجيل دخول ينشئ حساب المستخدم ومساحة العمل".
     */
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await createTenantForNewUser({
        userId: user.id,
        userEmail: user.email,
        userName: user.name ?? user.email.split("@")[0],
      });
      // مستقل تمامًا عن إنشاء المساحة أعلاه: عضوية فريق تشغيل المنصة لا
      // علاقة لها بامتلاك مساحة عمل كمستأجر عادي (قد يجتمعان لنفس الشخص).
      await consumePlatformAdminInvite(user.id, user.email);
    },
  },
});
