import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BookCreateInput = z.object({
  title: z.string().trim().min(1, "عنوان الكتاب مطلوب"),
  author: z.string().trim().min(1, "اسم المؤلف مطلوب"),
  category: z.string().trim().default("عام"),
  description: z.string().default(""),
  format: z.enum(["digital", "physical", "both"]).default("both"),
  price_digital: z.number().nonnegative().nullable().optional(),
  price_physical: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  pages: z.number().int().positive().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(["approved", "pending", "rejected"]).default("approved"),
});

// Admin-only: runs as the signed-in user so the database's admin policies decide access.
export const adminCreateBookServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BookCreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return { success: false as const, error: "هذه العملية متاحة للإدارة فقط" };
    }

    const { data: inserted, error } = await supabase
      .from("books")
      .insert({
        title: data.title,
        author: data.author,
        category: data.category,
        description: data.description,
        format: data.format,
        price_digital: data.price_digital ?? null,
        price_physical: data.price_physical ?? null,
        stock: data.stock,
        pages: data.pages ?? null,
        cover_url: data.cover_url ?? null,
        file_path: data.file_path ?? null,
        featured: data.featured,
        status: data.status,
      })
      .select()
      .single();

    if (error) {
      console.error("adminCreateBookServerFn database error:", error);
      return { success: false as const, error: error.message };
    }
    return { success: true as const, book: inserted };
  });
