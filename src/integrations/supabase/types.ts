export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      author_earnings: {
        Row: {
          amount: number
          author_id: string
          book_title: string
          created_at: string
          currency: string
          format: string
          gross: number
          id: string
          order_item_id: string
          quantity: number
          reversed: boolean
          share: number
        }
        Insert: {
          amount: number
          author_id: string
          book_title: string
          created_at?: string
          currency: string
          format: string
          gross: number
          id?: string
          order_item_id: string
          quantity: number
          reversed?: boolean
          share: number
        }
        Update: {
          amount?: number
          author_id?: string
          book_title?: string
          created_at?: string
          currency?: string
          format?: string
          gross?: number
          id?: string
          order_item_id?: string
          quantity?: number
          reversed?: boolean
          share?: number
        }
        Relationships: [
          {
            foreignKeyName: "author_earnings_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_earnings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      author_payouts: {
        Row: {
          amount: number
          author_id: string
          created_at: string
          currency: string
          id: string
          reference: string | null
          status: string
          transfer_details: string
        }
        Insert: {
          amount: number
          author_id: string
          created_at?: string
          currency: string
          id?: string
          reference?: string | null
          status?: string
          transfer_details: string
        }
        Update: {
          amount?: number
          author_id?: string
          created_at?: string
          currency?: string
          id?: string
          reference?: string | null
          status?: string
          transfer_details?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_payouts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          category: string
          cover_url: string | null
          created_at: string
          description: string
          featured: boolean
          file_path: string | null
          format: Database["public"]["Enums"]["book_format"]
          id: string
          pages: number | null
          price_digital: number | null
          price_physical: number | null
          publisher_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["book_status"]
          stock: number
          title: string
        }
        Insert: {
          author: string
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          file_path?: string | null
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          pages?: number | null
          price_digital?: number | null
          price_physical?: number | null
          publisher_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          stock?: number
          title: string
        }
        Update: {
          author?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          file_path?: string | null
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          pages?: number | null
          price_digital?: number | null
          price_physical?: number | null
          publisher_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          stock?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscript_versions: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          manuscript_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          manuscript_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          manuscript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manuscript_versions_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      manuscripts: {
        Row: {
          author_id: string
          author_name: string
          book_id: string | null
          created_at: string
          final_path: string | null
          format: Database["public"]["Enums"]["book_format"]
          id: string
          review_note: string
          stage: string
          synopsis: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          book_id?: string | null
          created_at?: string
          final_path?: string | null
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          review_note?: string
          stage?: string
          synopsis?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          book_id?: string | null
          created_at?: string
          final_path?: string | null
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          review_note?: string
          stage?: string
          synopsis?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manuscripts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manuscripts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          book_id: string
          created_at: string
          format: string
          id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          book_id: string
          created_at?: string
          format: string
          id?: string
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          book_id?: string
          created_at?: string
          format?: string
          id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          payment_reference: string | null
          payment_state: string
          settlement_currency: string
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: string
          total: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          payment_reference?: string | null
          payment_state?: string
          settlement_currency?: string
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total?: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          payment_reference?: string | null
          payment_state?: string
          settlement_currency?: string
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      production_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          manuscript_id: string
          note: string
          stage: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          manuscript_id: string
          note?: string
          stage: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          manuscript_id?: string
          note?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_events_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string
          items: Json
          manuscript_id: string
          payment_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          items?: Json
          manuscript_id: string
          payment_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          items?: Json
          manuscript_id?: string
          payment_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_invoices_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: true
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          currency: string
          display_name: string | null
          id: string
          language: string
          shipping_address: string
          shipping_name: string
          shipping_phone: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          language?: string
          shipping_address?: string
          shipping_name?: string
          shipping_phone?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          language?: string
          shipping_address?: string
          shipping_name?: string
          shipping_phone?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          author_code: string
          bio: string | null
          created_at: string
          id: string
          store_name: string
        }
        Insert: {
          author_code?: string
          bio?: string | null
          created_at?: string
          id: string
          store_name: string
        }
        Update: {
          author_code?: string
          bio?: string | null
          created_at?: string
          id?: string
          store_name?: string
        }
        Relationships: []
      }
      reader_favorites: {
        Row: {
          book_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_book_file: { Args: { _path: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_payout_day: { Args: { _date: string }; Returns: boolean }
      manage_manuscript: {
        Args: { _action: string; _data?: Json; _id: string }
        Returns: undefined
      }
      place_order: {
        Args: { _address: string; _items: Json; _name: string; _phone: string }
        Returns: string
      }
      request_author_payout: {
        Args: { _currency: string; _details: string }
        Returns: string
      }
      review_author_payout: {
        Args: { _id: string; _reference: string; _status: string }
        Returns: undefined
      }
      submit_manuscript: {
        Args: {
          _author_name: string
          _filename: string
          _format: Database["public"]["Enums"]["book_format"]
          _id?: string
          _path: string
          _synopsis: string
          _title: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      book_format: "digital" | "physical" | "both"
      book_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      book_format: ["digital", "physical", "both"],
      book_status: ["pending", "approved", "rejected"],
    },
  },
} as const
