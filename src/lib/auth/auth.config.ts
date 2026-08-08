import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * إعداد المصادقة - Google OAuth فقط، دون أي دعم لتسجيل الدخول بالبريد/كلمة المرور
 * وفق المتطلبات الرسمية للمشروع.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // نطلب فقط البيانات الأساسية اللازمة لإنشاء الحساب
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 يومًا
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * حماية المسارات: أي مسار داخل /app يتطلب جلسة صالحة.
     * منطق التحقق من الدور/الصلاحية يتم لاحقًا في كل route عبر requireRole().
     */
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = request.nextUrl.pathname.startsWith("/app");
      const isSuperAdminRoute = request.nextUrl.pathname.startsWith("/super-admin");

      if (isAppRoute || isSuperAdminRoute) {
        return isLoggedIn;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.platformRole =
          (user as { platformRole?: import("@prisma/client").PlatformRole | null })
            .platformRole ?? null;
      }
      return session;
    },
  },
};
