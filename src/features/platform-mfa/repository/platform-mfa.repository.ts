import "server-only";
import { prisma } from "@/lib/prisma";

export const platformMfaRepository = {
  findUserMfaState(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaRecoveryCodesHashed: true,
        mfaEnrolledAt: true,
      },
    });
  },

  /** يُخزِّن سرًا مُشفَّرًا مؤقتًا (قبل التأكيد - mfaEnabled يبقى false حتى confirmEnrollment). */
  savePendingSecret(userId: string, secretEncrypted: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEncrypted: secretEncrypted, mfaEnabled: false },
    });
  },

  enable(userId: string, recoveryCodesHashed: string[]) {
    return prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaEnrolledAt: new Date(), mfaRecoveryCodesHashed: recoveryCodesHashed },
    });
  },

  disable(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaRecoveryCodesHashed: [],
        mfaEnrolledAt: null,
      },
    });
  },

  /** يستهلك كود استرداد واحدًا (يُزال من القائمة فور استخدامه - لمرة واحدة فقط). */
  consumeRecoveryCode(userId: string, remainingHashedCodes: string[]) {
    return prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodesHashed: remainingHashedCodes },
    });
  },

  findSessionByToken(sessionToken: string) {
    return prisma.session.findUnique({ where: { sessionToken } });
  },

  markSessionMfaVerified(sessionToken: string) {
    return prisma.session.update({
      where: { sessionToken },
      data: { mfaVerifiedAt: new Date() },
    });
  },
};
