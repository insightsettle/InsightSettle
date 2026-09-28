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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      deal_events: {
        Row: {
          actor_id: string | null
          created_at: string
          deal_id: string
          id: string
          note: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          deal_id: string
          id?: string
          note?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          note?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_messages: {
        Row: {
          author_id: string | null
          author_kind: string
          author_name: string
          body: string
          created_at: string
          deal_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_kind?: string
          author_name?: string
          body: string
          created_at?: string
          deal_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_kind?: string
          author_name?: string
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_ratings: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          ratee_id: string
          rater_id: string
          score: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          deal_id: string
          id?: string
          ratee_id: string
          rater_id: string
          score: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_ratings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string
          error_message: string | null
          fee: number
          fx_quote_id: string | null
          id: string
          idempotency_key: string | null
          kind: string
          note: string | null
          original_transaction_id: string | null
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id: string
          error_message?: string | null
          fee?: number
          fx_quote_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind: string
          note?: string | null
          original_transaction_id?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string
          error_message?: string | null
          fee?: number
          fx_quote_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          note?: string | null
          original_transaction_id?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_transactions_fx_quote_id_fkey"
            columns: ["fx_quote_id"]
            isOneToOne: false
            referencedRelation: "fx_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "deal_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number
          auto_release_at: string | null
          buyer_id: string | null
          counterparty_email: string | null
          created_at: string
          created_by: string
          currency: string
          delivered_at: string | null
          description: string
          disputed_reason: string | null
          due_at: string | null
          fee_override_by: string | null
          fee_override_flat: number | null
          fee_override_note: string | null
          fee_override_percent: number | null
          fee_payer: string
          id: string
          inspection_days: number
          invite_token: string
          ref: string
          refunded_amount: number
          released_at: string | null
          risk_checked_at: string | null
          risk_level: string | null
          risk_score: number | null
          risk_summary: string | null
          seller_id: string | null
          shipping_carrier: string | null
          shipping_status: string | null
          shipping_tracking: string | null
          status: string
          terms_note: string | null
          terms_status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          auto_release_at?: string | null
          buyer_id?: string | null
          counterparty_email?: string | null
          created_at?: string
          created_by: string
          currency?: string
          delivered_at?: string | null
          description?: string
          disputed_reason?: string | null
          due_at?: string | null
          fee_override_by?: string | null
          fee_override_flat?: number | null
          fee_override_note?: string | null
          fee_override_percent?: number | null
          fee_payer?: string
          id?: string
          inspection_days?: number
          invite_token?: string
          ref?: string
          refunded_amount?: number
          released_at?: string | null
          risk_checked_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_summary?: string | null
          seller_id?: string | null
          shipping_carrier?: string | null
          shipping_status?: string | null
          shipping_tracking?: string | null
          status?: string
          terms_note?: string | null
          terms_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_release_at?: string | null
          buyer_id?: string | null
          counterparty_email?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          delivered_at?: string | null
          description?: string
          disputed_reason?: string | null
          due_at?: string | null
          fee_override_by?: string | null
          fee_override_flat?: number | null
          fee_override_note?: string | null
          fee_override_percent?: number | null
          fee_payer?: string
          id?: string
          inspection_days?: number
          invite_token?: string
          ref?: string
          refunded_amount?: number
          released_at?: string | null
          risk_checked_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_summary?: string | null
          seller_id?: string | null
          shipping_carrier?: string | null
          shipping_status?: string | null
          shipping_tracking?: string | null
          status?: string
          terms_note?: string | null
          terms_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_rules: {
        Row: {
          amount_from: number
          amount_to: number | null
          country: string | null
          id: string
          label: string
          max_fee: number | null
          min_fee: number
          percent: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount_from?: number
          amount_to?: number | null
          country?: string | null
          id?: string
          label: string
          max_fee?: number | null
          min_fee?: number
          percent?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount_from?: number
          amount_to?: number | null
          country?: string | null
          id?: string
          label?: string
          max_fee?: number | null
          min_fee?: number
          percent?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fx_quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_amount: number
          customer_rate: number
          deal_id: string
          expires_at: string
          fee: number
          fx_spread: number
          id: string
          provider_amount: number
          provider_rate: number
          source_amount: number
          source_currency: string
          target_currency: string
          total: number
          used_at: string | null
          vat: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_amount: number
          customer_rate: number
          deal_id: string
          expires_at: string
          fee?: number
          fx_spread: number
          id?: string
          provider_amount: number
          provider_rate: number
          source_amount: number
          source_currency: string
          target_currency?: string
          total: number
          used_at?: string | null
          vat?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_amount?: number
          customer_rate?: number
          deal_id?: string
          expires_at?: string
          fee?: number
          fx_spread?: number
          id?: string
          provider_amount?: number
          provider_rate?: number
          source_amount?: number
          source_currency?: string
          target_currency?: string
          total?: number
          used_at?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "fx_quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          active: boolean
          code: string
          minor_units: number
          name: string
          provider_rate: number
          spread: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          code: string
          minor_units?: number
          name: string
          provider_rate: number
          spread?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          minor_units?: number
          name?: string
          provider_rate?: number
          spread?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account: string
          created_at: string
          credit: number
          currency: string
          deal_id: string
          debit: number
          id: string
          reference: string | null
          transaction_id: string | null
        }
        Insert: {
          account: string
          created_at?: string
          credit?: number
          currency: string
          deal_id: string
          debit?: number
          id?: string
          reference?: string | null
          transaction_id?: string | null
        }
        Update: {
          account?: string
          created_at?: string
          credit?: number
          currency?: string
          deal_id?: string
          debit?: number
          id?: string
          reference?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "deal_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deal_id: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
