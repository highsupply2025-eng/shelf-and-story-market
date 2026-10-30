import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  title: z.string().trim().max(200).default(""),
  description: z.string().trim().min(20).max(4000),
  language: z.enum(["ar", "en"]),
});

const Result = z.object({
  blurb: z.string(),
  keywords: z.array(z.string()),
});

export const generateBookBlurb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: pub } = await context.supabase.from("publishers").select("id").eq("id", context.userId).maybeSingle();
    if (!pub) return { error: "author_required" as const };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "config" as const };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const lang = data.language === "ar" ? "Arabic" : "English";
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        instructions: `You are a book marketing copywriter. Write in ${lang}. Produce a compelling 80-140 word marketing blurb for a bookstore page, faithful to the author's description (no invented facts), and 8-12 short SEO keywords/phrases readers would search for.`,
        messages: [{ role: "user", content: `Title: ${data.title || "(untitled)"}\n\nDescription:\n${data.description}` }],
        output: Output.object({ schema: Result }),
        providerOptions: {
          openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] },
        },
      });
      const out = await result.output;
      return { blurb: out.blurb, keywords: out.keywords.slice(0, 12) };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("blurb generation failed", status, e);
      if (status === 429) return { error: "rate" as const };
      if (status === 402 || status === 403) return { error: "credits" as const };
      return { error: "failed" as const };
    }
  });
