// حزمة `bidi-js` لا تُصدِّر أنواع TypeScript ولا يوجد لها حزمة
// `@types/bidi-js` منشورة - هذا الملف يُعرِّفها كوحدة (module) بأدنى حد
// كافٍ يطابق طريقة استخدامها الفعلية في arabic-shaping.ts، لإسكات خطأ
// TS7016 دون التأثير على السلوك وقت التشغيل.
declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface BidiEngine {
    getEmbeddingLevels: (text: string, direction?: "ltr" | "rtl" | "auto") => EmbeddingLevels;
    getReorderedString: (text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number) => string;
    getReorderSegments: (
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number
    ) => Array<[number, number]>;
    getMirroredCharactersMap: (
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number
    ) => Map<number, string>;
  }

  export default function bidiFactory(): BidiEngine;
}
