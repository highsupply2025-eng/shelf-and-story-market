import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BookCreateInput = z.object({
  title: z.string().trim().min(1, "عنوان الكتاب مطلوب"),
  author: z.string().trim().min(1, "اسم المؤلف مطلوب"),
  category: z.string().trim().default("عام"),
  description: z.string().default(""),
  format: z.enum(["digital", "physical", "both"]).default("both"),
  price_digital: z.number().nullable().optional(),
  price_physical: z.number().nullable().optional(),
  stock: z.number().default(0),
  pages: z.number().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(["approved", "pending", "rejected"]).default("approved"),
});

export const adminCreateBookServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BookCreateInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inserted, error } = await supabaseAdmin
        .from("books")
        .insert({
          title: data.title,
          author: data.author,
          category: data.category,
          description: data.description,
          format: data.format,
          price_digital: data.price_digital,
          price_physical: data.price_physical,
          stock: data.stock,
          pages: data.pages,
          cover_url: data.cover_url,
          file_path: data.file_path,
          featured: data.featured,
          status: data.status,
        })
        .select()
        .single();

      if (error) {
        console.error("adminCreateBookServerFn database error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, book: inserted };
    } catch (err: any) {
      console.error("adminCreateBookServerFn exception:", err);
      return { success: false, error: err?.message || "Failed to create book record" };
    }
  });
