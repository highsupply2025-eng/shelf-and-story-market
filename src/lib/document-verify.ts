export type DocumentPhotoKind = "photo_4x6" | "id_front" | "id_back" | "passport";

export interface DocumentValidationResult {
  ok: boolean;
  reasonAr?: string;
  reasonEn?: string;
}

const MIN_BYTES = 25 * 1024; // 25 KB minimum to block tiny web thumbnails/icons

export async function validateRealDocumentImage(
  file: File,
  kind: DocumentPhotoKind
): Promise<DocumentValidationResult> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    return {
      ok: false,
      reasonAr: "يُسمح فقط بملفات الصور الحقيقية (JPG أو PNG أو WebP).",
      reasonEn: "Only real image files (JPG, PNG, WebP) are allowed.",
    };
  }

  if (file.size < MIN_BYTES) {
    return {
      ok: false,
      reasonAr: "حجم الصورة صغير جداً (أقل من 25 KB) ولا يصلح كصورة رسمية حقيقية. يرجى رفع صورة واضحة وعالية الدقة.",
      reasonEn: "Image file is too small (< 25 KB) to be a real official document/photo.",
    };
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    image.src = url;
  }).catch(() => null);

  if (!img || !img.width || !img.height) {
    return {
      ok: false,
      reasonAr: "تعذر قراءة الصورة. يرجى اختيار صورة حقيقية صالحة.",
      reasonEn: "Could not read image. Please select a valid photo.",
    };
  }

  const ratio = img.width / img.height;

  if (kind === "photo_4x6") {
    if (img.width < 300 || img.height < 350) {
      return {
        ok: false,
        reasonAr: "دقة الصورة الشخصية 4×6 منخفضة جداً (الحد الأدنى 300×350 بكسل).",
        reasonEn: "4x6 photo resolution is too low (minimum 300x350 px).",
      };
    }
    if (ratio < 0.55 || ratio > 1.05) {
      return {
        ok: false,
        reasonAr: "أبعاد الصورة لا تطابق صورة شخصية 4×6 (يجب أن تكون صورة طولية أو شبه مربعة لوجه الشخص).",
        reasonEn: "Image aspect ratio does not match a 4x6 portrait photo.",
      };
    }
  } else if (kind === "id_front" || kind === "id_back") {
    if (img.width < 450 || img.height < 280) {
      return {
        ok: false,
        reasonAr: "دقة صورة البطاقة / الهوية منخفضة جداً (الحد الأدنى 450×280 بكسل).",
        reasonEn: "National ID photo resolution is too low (minimum 450x280 px).",
      };
    }
    if (ratio < 1.15 || ratio > 2.2) {
      return {
        ok: false,
        reasonAr: "أبعاد الصورة لا تطابق بطاقة هوية حقيقية (يجب أن تكون بالعرض واضحة ومقصوصة على البطاقة).",
        reasonEn: "Aspect ratio does not match a landscape National ID card.",
      };
    }
  } else if (kind === "passport") {
    if (img.width < 450 || img.height < 300) {
      return {
        ok: false,
        reasonAr: "دقة صورة جواز السفر منخفضة جداً (الحد الأدنى 450×300 بكسل).",
        reasonEn: "Passport photo resolution is too low (minimum 450x300 px).",
      };
    }
  }

  // Pixel variance check: reject blank, solid-color, or flat synthetic graphics
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, 64, 64);
      const { data } = ctx.getImageData(0, 0, 64, 64);
      let sum = 0;
      let sumSq = 0;
      const count = 64 * 64;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
        sum += lum;
        sumSq += lum * lum;
      }
      const mean = sum / count;
      const stdDev = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
      if (stdDev < 14) {
        return {
          ok: false,
          reasonAr: "الصورة المرفوعة فارغة أو أحادية اللون ولا تبدو كصورة حقيقية.",
          reasonEn: "Uploaded image appears blank or flat and not a real photograph.",
        };
      }
    }
  } catch {
    // ignore canvas errors
  }

  // Use native FaceDetector when supported (Chrome/Edge) for 4x6 portrait photos
  if (kind === "photo_4x6" && typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      const FaceDetectorCtor = (window as unknown as { FaceDetector: new () => { detect: (img: HTMLImageElement) => Promise<unknown[]> } }).FaceDetector;
      const detector = new FaceDetectorCtor();
      const faces = await detector.detect(img);
      if (Array.isArray(faces) && faces.length === 0) {
        return {
          ok: false,
          reasonAr: "لم يتم التعرف على وجه شخص حقيقي في الصورة الشخصية 4×6. يرجى رفع صورة شخصية واضحة لوجه المؤلف فقط (وليس غلاف كتاب أو صورة أخرى).",
          reasonEn: "No real human face detected in the 4x6 personal photo. Please upload a clear portrait photo.",
        };
      }
    } catch {
      // FaceDetector unavailable or blocked on this platform; continue to server check
    }
  }

  return { ok: true };
}
