import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  kind: z.enum(["photo_4x6", "id_front", "id_back", "passport"]),
  dataUrl: z.string().min(50).max(3_000_000),
});

const Verdict = z.object({
  valid: z.boolean(),
  reason_ar: z.string(),
});

export const verifyDocumentPhotoAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];
    const apiKey = lovableKey || openaiKey;
    if (!apiKey) return { valid: true, skipped: true as const };

    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { streamText, Output } = await import("ai");
      const provider = lovableKey
        ? createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey: lovableKey,
            headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          })
        : createOpenAI({ apiKey });

      const rules: Record<typeof data.kind, string> = {
        photo_4x6:
          "Must be a real 4x6 / ID-style portrait photograph of a real human person's face. Reject book covers, cartoons, drawings, landscapes, objects, or blurry unidentifiable images.",
        id_front:
          "Must be a real photograph of the FRONT side of an official National ID card or government identity card showing a photo and text. Reject book covers, random photos, memes, or blank images.",
        id_back:
          "Must be a real photograph of the BACK side of an official National ID card or government identity card. Reject book covers, random photos, memes, or blank images.",
        passport:
          "Must be a real photograph of an official passport photo/data page. Reject book covers, random photos, memes, or blank images.",
      };

      const result = streamText({
        model: provider.responses(lovableKey ? "openai/gpt-4o-mini" : "gpt-4o-mini"),
        maxRetries: 0,
        instructions:
          "You are a strict KYC document verification officer. Inspect the provided image and decide if it satisfies the rule. If invalid, write a clear, short rejection message in Arabic in reason_ar.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Rule: ${rules[data.kind]}` },
              { type: "image", image: data.dataUrl },
            ],
          },
        ],
        output: Output.object({ schema: Verdict }),
      });

      const out = await result.output;
      return { valid: out.valid, reason_ar: out.reason_ar, skipped: false as const };
    } catch {
      return { valid: true, skipped: true as const };
    }
  });
