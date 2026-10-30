import { AuthorStudio } from "@/components/AuthorStudio";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PenLine, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Book } from "@/components/BookCard";

export const Route = createFileRoute("/_authenticated/publisher")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة الناشر — unibook" },
      { name: "description", content: "انشر كتبك الرقمية والورقية وتابع مبيعاتك." },
      { property: "og:title", content: "لوحة الناشر — unibook" },
      { property: "og:description", content: "انشر كتبك الرقمية والورقية وتابع مبيعاتك." },
    ],
  }),
  component: AuthorStudio,
});

