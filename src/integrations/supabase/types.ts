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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      auction_lots: {
        Row: {
          auction_id: string
          deal_id: string | null
          description: string
          funded_deal_id: string | null
          funding_tx_id: string | null
          id: string
          images: string[]
          organiser_pct: number | null
          owner_id: string
          owner_pct: number | null
          split_locked_at: string | null
          status: string
          title: string
        }
        Insert: {
          auction_id: string
          deal_id?: string | null
          description?: string
          funded_deal_id?: string | null
          funding_tx_id?: string | null
          id?: string
          images?: string[]
          organiser_pct?: number | null
          owner_id: string
          owner_pct?: number | null
          split_locked_at?: string | null
          status?: string
          title: string
        }
        Update: {
          auction_id?: string
          deal_id?: string | null
          description?: string
          funded_deal_id?: string | null
          funding_tx_id?: string | null
          id?: string
          images?: string[]
          organiser_pct?: number | null
          owner_id?: string
          owner_pct?: number | null
          split_locked_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_lots_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_funded_deal_id_fkey"
            columns: ["funded_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_funding_tx_id_fkey"
            columns: ["funding_tx_id"]
            isOneToOne: false
            referencedRelation: "deal_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          created_at: string
          currency: string
          id: string
          inspection_hours: number
          organiser_commission_pct: number
          organiser_id: string
          payment_deadline_hours: number
          platform: string
          starts_at: string | null
          status: string
          stream_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          inspection_hours?: number
          organiser_commission_pct?: number
          organiser_id: string
          payment_deadline_hours?: number
          platform: string
          starts_at?: string | null
          status?: string
          stream_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          inspection_hours?: number
          organiser_commission_pct?: number
          organiser_id?: string
          payment_deadline_hours?: number
          platform?: string
          starts_at?: string | null
          status?: string
          stream_url?: string | null
          title?: string
        }
        Relationships: []
      }
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
      business_profiles: {
        Row: {
          authorized_person: string | null
          country: string
          created_at: string
          legal_name: string
          registration_number: string
          tax_number: string | null
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          authorized_person?: string | null
          country: string
          created_at?: string
          legal_name: string
          registration_number: string
          tax_number?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          authorized_person?: string | null
          country?: string
          created_at?: string
          legal_name?: string
          registration_number?: string
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      deal_attachments: {
        Row: {
          category: string
          created_at: string
          deal_id: string
          file_name: string
          file_path: string
          id: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          deal_id: string
          file_name: string
          file_path: string
          id?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          deal_id?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
      deal_milestones: {
        Row: {
          amount: number
          approved_at: string | null
          auto_release_at: string | null
          created_at: string
          deal_id: string
          description: string | null
          due_date: string | null
          evidence_note: string | null
          evidence_required: string | null
          fee_share: number
          funded_at: string | null
          id: string
          kind: string
          net_released: number
          released_at: string | null
          retention_amount: number
          revision_note: string | null
          seq: number
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          vat: number
        }
        Insert: {
          amount: number
          approved_at?: string | null
          auto_release_at?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          due_date?: string | null
          evidence_note?: string | null
          evidence_required?: string | null
          fee_share?: number
          funded_at?: string | null
          id?: string
          kind?: string
          net_released?: number
          released_at?: string | null
          retention_amount?: number
          revision_note?: string | null
          seq: number
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
          vat?: number
        }
        Update: {
          amount?: number
          approved_at?: string | null
          auto_release_at?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          due_date?: string | null
          evidence_note?: string | null
          evidence_required?: string | null
          fee_share?: number
          funded_at?: string | null
          id?: string
          kind?: string
          net_released?: number
          released_at?: string | null
          retention_amount?: number
          revision_note?: string | null
          seq?: number
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_milestones_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_payout_splits: {
        Row: {
          amount: number
          beneficiary_id: string
          currency: string
          deal_id: string
          id: string
          pct: number
          release_tx_id: string | null
          role: string
        }
        Insert: {
          amount: number
          beneficiary_id: string
          currency: string
          deal_id: string
          id?: string
          pct: number
          release_tx_id?: string | null
          role: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          currency?: string
          deal_id?: string
          id?: string
          pct?: number
          release_tx_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_payout_splits_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_payout_splits_release_tx_id_fkey"
            columns: ["release_tx_id"]
            isOneToOne: true
            referencedRelation: "deal_transactions"
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
      deal_term_versions: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          note: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          note?: string | null
          snapshot: Json
          version: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          note?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_term_versions_deal_id_fkey"
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
          auction_dispute_id: string | null
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
          milestone_id: string | null
          note: string | null
          original_transaction_id: string | null
          payout_split_id: string | null
          provider: string
          provider_ref: string | null
          release_part: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          auction_dispute_id?: string | null
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
          milestone_id?: string | null
          note?: string | null
          original_transaction_id?: string | null
          payout_split_id?: string | null
          provider?: string
          provider_ref?: string | null
          release_part?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auction_dispute_id?: string | null
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
          milestone_id?: string | null
          note?: string | null
          original_transaction_id?: string | null
          payout_split_id?: string | null
          provider?: string
          provider_ref?: string | null
          release_part?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_transactions_auction_dispute_id_fkey"
            columns: ["auction_dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "deal_transactions_payout_split_id_fkey"
            columns: ["payout_split_id"]
            isOneToOne: false
            referencedRelation: "deal_payout_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          acceptance_criteria: string | null
          amount: number
          auction_lot_id: string | null
          auto_release_at: string | null
          auto_release_enabled: boolean
          buyer_id: string | null
          cancellation_conditions: string | null
          cancelled_at: string | null
          counterparty_email: string | null
          created_at: string
          created_by: string
          currency: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          defects_liability_days: number
          delivered_at: string | null
          delivery_country: string | null
          description: string
          disputed_reason: string | null
          due_at: string | null
          estimated_delivery_at: string | null
          fee_override_by: string | null
          fee_override_flat: number | null
          fee_override_note: string | null
          fee_override_percent: number | null
          fee_payer: string
          frozen: boolean
          frozen_reason: string | null
          funding_mode: string
          handover_at: string | null
          id: string
          inspection_days: number
          invite_token: string
          payment_deadline_at: string | null
          quantity: number
          ref: string
          refund_conditions: string | null
          refunded_amount: number
          released_at: string | null
          retention_percent: number
          retention_release_at: string | null
          retention_released_at: string | null
          revisions_included: number
          revisions_used: number
          risk_checked_at: string | null
          risk_level: string | null
          risk_score: number | null
          risk_summary: string | null
          seller_id: string | null
          shipped_at: string | null
          shipping_carrier: string | null
          shipping_responsibility: string
          shipping_status: string | null
          shipping_tracking: string | null
          status: string
          supplier_country: string | null
          terms_note: string | null
          terms_status: string
          terms_version: number
          title: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string | null
          amount: number
          auction_lot_id?: string | null
          auto_release_at?: string | null
          auto_release_enabled?: boolean
          buyer_id?: string | null
          cancellation_conditions?: string | null
          cancelled_at?: string | null
          counterparty_email?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          defects_liability_days?: number
          delivered_at?: string | null
          delivery_country?: string | null
          description?: string
          disputed_reason?: string | null
          due_at?: string | null
          estimated_delivery_at?: string | null
          fee_override_by?: string | null
          fee_override_flat?: number | null
          fee_override_note?: string | null
          fee_override_percent?: number | null
          fee_payer?: string
          frozen?: boolean
          frozen_reason?: string | null
          funding_mode?: string
          handover_at?: string | null
          id?: string
          inspection_days?: number
          invite_token?: string
          payment_deadline_at?: string | null
          quantity?: number
          ref?: string
          refund_conditions?: string | null
          refunded_amount?: number
          released_at?: string | null
          retention_percent?: number
          retention_release_at?: string | null
          retention_released_at?: string | null
          revisions_included?: number
          revisions_used?: number
          risk_checked_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_summary?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_responsibility?: string
          shipping_status?: string | null
          shipping_tracking?: string | null
          status?: string
          supplier_country?: string | null
          terms_note?: string | null
          terms_status?: string
          terms_version?: number
          title: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string | null
          amount?: number
          auction_lot_id?: string | null
          auto_release_at?: string | null
          auto_release_enabled?: boolean
          buyer_id?: string | null
          cancellation_conditions?: string | null
          cancelled_at?: string | null
          counterparty_email?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          defects_liability_days?: number
          delivered_at?: string | null
          delivery_country?: string | null
          description?: string
          disputed_reason?: string | null
          due_at?: string | null
          estimated_delivery_at?: string | null
          fee_override_by?: string | null
          fee_override_flat?: number | null
          fee_override_note?: string | null
          fee_override_percent?: number | null
          fee_payer?: string
          frozen?: boolean
          frozen_reason?: string | null
          funding_mode?: string
          handover_at?: string | null
          id?: string
          inspection_days?: number
          invite_token?: string
          payment_deadline_at?: string | null
          quantity?: number
          ref?: string
          refund_conditions?: string | null
          refunded_amount?: number
          released_at?: string | null
          retention_percent?: number
          retention_release_at?: string | null
          retention_released_at?: string | null
          revisions_included?: number
          revisions_used?: number
          risk_checked_at?: string | null
          risk_level?: string | null
          risk_score?: number | null
          risk_summary?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_responsibility?: string
          shipping_status?: string | null
          shipping_tracking?: string | null
          status?: string
          supplier_country?: string | null
          terms_note?: string | null
          terms_status?: string
          terms_version?: number
          title?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_auction_lot_id_fkey"
            columns: ["auction_lot_id"]
            isOneToOne: false
            referencedRelation: "auction_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string | null
          file_path: string | null
          id: string
          note: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          note?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          note?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          buyer_percent: number | null
          created_at: string
          deal_id: string
          details: string
          evidence_deadline: string
          id: string
          milestone_id: string | null
          opened_by: string
          outcome: string | null
          reason: string
          resolution_deadline: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_deadline: string
          review_started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_percent?: number | null
          created_at?: string
          deal_id: string
          details: string
          evidence_deadline: string
          id?: string
          milestone_id?: string | null
          opened_by: string
          outcome?: string | null
          reason: string
          resolution_deadline: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_deadline: string
          review_started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_percent?: number | null
          created_at?: string
          deal_id?: string
          details?: string
          evidence_deadline?: string
          id?: string
          milestone_id?: string | null
          opened_by?: string
          outcome?: string | null
          reason?: string
          resolution_deadline?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_deadline?: string
          review_started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_rules: {
        Row: {
          amount_from: number
          amount_to: number | null
          country: string | null
          currency: string
          id: string
          label: string
          max_fee: number | null
          min_fee: number
          percent: number
          provisional: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount_from?: number
          amount_to?: number | null
          country?: string | null
          currency?: string
          id?: string
          label: string
          max_fee?: number | null
          min_fee?: number
          percent?: number
          provisional?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount_from?: number
          amount_to?: number | null
          country?: string | null
          currency?: string
          id?: string
          label?: string
          max_fee?: number | null
          min_fee?: number
          percent?: number
          provisional?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fx_quotes: {
        Row: {
          breakdown: Json | null
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
          breakdown?: Json | null
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
          breakdown?: Json | null
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
      lot_bidders: {
        Row: {
          deadline_at: string | null
          deal_id: string | null
          email: string
          id: string
          lot_id: string
          offered_at: string | null
          platform_handle: string
          price: number
          rank: number
          status: string
          user_id: string | null
        }
        Insert: {
          deadline_at?: string | null
          deal_id?: string | null
          email: string
          id?: string
          lot_id: string
          offered_at?: string | null
          platform_handle: string
          price: number
          rank: number
          status?: string
          user_id?: string | null
        }
        Update: {
          deadline_at?: string | null
          deal_id?: string | null
          email?: string
          id?: string
          lot_id?: string
          offered_at?: string | null
          platform_handle?: string
          price?: number
          rank?: number
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_bidders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_bidders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "auction_lots"
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
      payout_accounts: {
        Row: {
          account_name: string
          bank_name: string
          country: string
          created_at: string
          currency: string | null
          iban: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          account_name: string
          bank_name: string
          country: string
          created_at?: string
          currency?: string | null
          iban: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          account_name?: string
          bank_name?: string
          country?: string
          created_at?: string
          currency?: string | null
          iban?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_state: string
          account_type: string
          address: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          id_number: string | null
          id_type: string | null
          nationality: string | null
          organises_auctions: boolean
          pdpl_consent_at: string | null
          phone: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_state?: string
          account_type?: string
          address?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id: string
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          organises_auctions?: boolean
          pdpl_consent_at?: string | null
          phone?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_state?: string
          account_type?: string
          address?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          organises_auctions?: boolean
          pdpl_consent_at?: string | null
          phone?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      risk_flags: {
        Row: {
          created_at: string
          deal_id: string | null
          factors: Json
          id: string
          level: string
          note: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          factors?: Json
          id?: string
          level: string
          note?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          factors?: Json
          id?: string
          level?: string
          note?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_flags_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_invoices: {
        Row: {
          currency: string
          deal_id: string
          fee: number
          id: string
          invoice_number: string
          issued_at: string
          lines: Json | null
          total: number
          vat: number
          vat_rate: number
        }
        Insert: {
          currency?: string
          deal_id: string
          fee: number
          id?: string
          invoice_number?: string
          issued_at?: string
          lines?: Json | null
          total: number
          vat: number
          vat_rate: number
        }
        Update: {
          currency?: string
          deal_id?: string
          fee?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          lines?: Json | null
          total?: number
          vat?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
      vat_rates: {
        Row: {
          country_code: string
          provisional: boolean
          rate: number
          updated_at: string
        }
        Insert: {
          country_code: string
          provisional?: boolean
          rate: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          provisional?: boolean
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_auction_bidder: {
        Args: { _decliner?: string; _lot: string }
        Returns: Json
      }
      auction_can_read_lot: { Args: { lid: string }; Returns: boolean }
      auction_is_organiser: { Args: { aid: string }; Returns: boolean }
      auction_is_verified_business: { Args: { uid: string }; Returns: boolean }
      auction_offer_bidder: { Args: { _bidder: string }; Returns: Json }
      auction_owner_by_email: {
        Args: { _actor: string; _auction: string; _email: string }
        Returns: string
      }
      auction_require_beneficiary: {
        Args: { cur: string; uid: string }
        Returns: undefined
      }
      claim_auction_invite: {
        Args: { _token: string; _user: string }
        Returns: string
      }
      create_auction_release: {
        Args: {
          _actor_id?: string
          _buyer_percent?: number
          _deal_id: string
          _dispute_id?: string
          _note?: string
          _outcome?: string
        }
        Returns: {
          id: string
        }[]
      }
      decline_auction_deal: {
        Args: { _buyer: string; _deal: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iban_is_valid: { Args: { _iban: string }; Returns: boolean }
      record_auction_winner: {
        Args: { _actor: string; _bidders: Json; _lot: string }
        Returns: Json
      }
      reserve_auction_funding: {
        Args: {
          _buyer: string
          _deal: string
          _note: string
          _provider: string
          _quote: string
        }
        Returns: string
      }
      run_auto_release: { Args: never; Returns: number }
      sweep_auction_deadlines: { Args: never; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "support"
        | "finance"
        | "compliance"
        | "super_admin"
      deal_type: "goods" | "services" | "contracting" | "freelance" | "auction"
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
      app_role: [
        "admin",
        "staff",
        "support",
        "finance",
        "compliance",
        "super_admin",
      ],
      deal_type: ["goods", "services", "contracting", "freelance", "auction"],
    },
  },
} as const
