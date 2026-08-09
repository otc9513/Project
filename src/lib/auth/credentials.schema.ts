import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./password";

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `كلمة المرور قصيرة جدًا (${MIN_PASSWORD_LENGTH} أحرف على الأقل)`)
  .regex(/[a-zA-Z]/, "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");

export const emailRegisterSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
    password: passwordField,
    confirmPassword: z.string(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
export type EmailRegisterInput = z.infer<typeof emailRegisterSchema>;

export const emailLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;

// التحقق العميق من صيغة الرقم العراقي (تطبيع + رفض غير العراقي) يتم في
// phone.ts وليس هنا، حتى يبقى منطق التطبيع في مكان واحد فقط (مصدر حقيقة
// وحيد يُستدعى من الـ schema والـ actions والفحص المسبق في الواجهة).
export const phoneRegisterSchema = z
  .object({
    phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
    password: passwordField,
    confirmPassword: z.string(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
export type PhoneRegisterInput = z.infer<typeof phoneRegisterSchema>;

export const phoneLoginSchema = z.object({
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
