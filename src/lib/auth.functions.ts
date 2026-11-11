import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const SignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  accountType: z.enum(["reader", "author", "publisher"]),
  publisherName: z.string().optional(),
  redirectTo: z.string().optional(),
});

export const serverSignUpFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignUpInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: res, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          ...(data.redirectTo ? { emailRedirectTo: data.redirectTo } : {}),
          data: {
            display_name: data.displayName,
            account_type: data.accountType,
            publisher_name: data.publisherName || "",
          },
        },
      });

      if (error) {
        return {
          ok: false as const,
          networkError: error.message?.toLowerCase().includes("fetch") ?? false,
          error: error.message,
        };
      }

      if ((data.accountType === "author" || data.accountType === "publisher") && res.user?.id) {
        try {
          await supabase.from("publishers").insert({
            id: res.user.id,
            store_name: data.displayName,
            bio:
              data.accountType === "publisher"
                ? "دار نشر ومؤسسة توزيع معتمدة في unibook"
                : "مؤلف وباحث علمي في unibook",
          });
        } catch {
          /* ignore */
        }
      }

      return {
        ok: true as const,
        userId: res.user?.id ?? null,
        session: res.session
          ? {
              access_token: res.session.access_token,
              refresh_token: res.session.refresh_token,
            }
          : null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false as const,
        networkError: true,
        error: msg,
      };
    }
  });

const SignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const serverSignInFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignInInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: res, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error || !res.session) {
        return {
          ok: false as const,
          networkError: error?.message?.toLowerCase().includes("fetch") ?? false,
          error: error?.message || "Invalid login credentials",
        };
      }

      return {
        ok: true as const,
        userId: res.user?.id ?? null,
        email: res.user?.email ?? data.email,
        accountType: (res.user?.user_metadata?.["account_type"] as string | undefined) ?? "reader",
        displayName: (res.user?.user_metadata?.["display_name"] as string | undefined) ?? "",
        session: {
          access_token: res.session.access_token,
          refresh_token: res.session.refresh_token,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false as const,
        networkError: true,
        error: msg,
      };
    }
  });
