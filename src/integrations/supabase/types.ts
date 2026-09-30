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
      admin_activity_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          category: string | null
          created_at: string
          details: Json | null
          id: string
          path: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id: string
          category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          path?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          path?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          provider?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_rates: {
        Row: {
          bank_name: string
          created_at: string
          effective_date: string
          id: string
          is_active: boolean
          loan_type: string
          max_rate: number
          min_rate: number
          processing_fee: string | null
          source: string
          updated_at: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          loan_type: string
          max_rate: number
          min_rate: number
          processing_fee?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          loan_type?: string
          max_rate?: number
          min_rate?: number
          processing_fee?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          insights: Json | null
          internal_links: Json | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          related_searches: string[] | null
          schema_jsonld: Json | null
          seo_keywords: Json | null
          sequence_number: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          trending_questions: string[] | null
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          insights?: Json | null
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_searches?: string[] | null
          schema_jsonld?: Json | null
          seo_keywords?: Json | null
          sequence_number?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          trending_questions?: string[] | null
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          insights?: Json | null
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_searches?: string[] | null
          schema_jsonld?: Json | null
          seo_keywords?: Json | null
          sequence_number?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          trending_questions?: string[] | null
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      forex_history: {
        Row: {
          code: string
          created_at: string
          date: string
          id: number
          rate_usd: number
        }
        Insert: {
          code: string
          created_at?: string
          date: string
          id?: number
          rate_usd: number
        }
        Update: {
          code?: string
          created_at?: string
          date?: string
          id?: number
          rate_usd?: number
        }
        Relationships: []
      }
      forex_logs: {
        Row: {
          completed_at: string | null
          error: string | null
          history_rows: number
          id: string
          rates_updated: number
          source: string | null
          started_at: string
          status: string
          trigger_type: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          history_rows?: number
          id?: string
          rates_updated?: number
          source?: string | null
          started_at?: string
          status?: string
          trigger_type?: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          history_rows?: number
          id?: string
          rates_updated?: number
          source?: string | null
          started_at?: string
          status?: string
          trigger_type?: string
        }
        Relationships: []
      }
      forex_rates: {
        Row: {
          code: string
          name: string | null
          rate_usd: number
          source: string
          updated_at: string
        }
        Insert: {
          code: string
          name?: string | null
          rate_usd: number
          source?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string | null
          rate_usd?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_banners: {
        Row: {
          banner_type: string
          bg_color: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_type?: string
          bg_color?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_type?: string
          bg_color?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mf_etfs: {
        Row: {
          ai_pros: Json | null
          ai_risks: Json | null
          ai_summary: string | null
          asset_class: string
          aum_cr: number | null
          avg_volume: number | null
          benchmark: string | null
          country_allocation: Json | null
          created_at: string
          expense_ratio: number | null
          holdings: Json | null
          id: string
          is_trending: boolean | null
          issuer: string | null
          ltp: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          nav: number | null
          premium_discount: number | null
          return_1m: number | null
          return_1y: number | null
          return_3m: number | null
          return_3y: number | null
          return_5y: number | null
          return_6m: number | null
          sector_allocation: Json | null
          slug: string
          sub_class: string | null
          symbol: string
          tracking_error: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          ai_pros?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          asset_class: string
          aum_cr?: number | null
          avg_volume?: number | null
          benchmark?: string | null
          country_allocation?: Json | null
          created_at?: string
          expense_ratio?: number | null
          holdings?: Json | null
          id?: string
          is_trending?: boolean | null
          issuer?: string | null
          ltp?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          nav?: number | null
          premium_discount?: number | null
          return_1m?: number | null
          return_1y?: number | null
          return_3m?: number | null
          return_3y?: number | null
          return_5y?: number | null
          return_6m?: number | null
          sector_allocation?: Json | null
          slug: string
          sub_class?: string | null
          symbol: string
          tracking_error?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          ai_pros?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          asset_class?: string
          aum_cr?: number | null
          avg_volume?: number | null
          benchmark?: string | null
          country_allocation?: Json | null
          created_at?: string
          expense_ratio?: number | null
          holdings?: Json | null
          id?: string
          is_trending?: boolean | null
          issuer?: string | null
          ltp?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          nav?: number | null
          premium_discount?: number | null
          return_1m?: number | null
          return_1y?: number | null
          return_3m?: number | null
          return_3y?: number | null
          return_5y?: number | null
          return_6m?: number | null
          sector_allocation?: Json | null
          slug?: string
          sub_class?: string | null
          symbol?: string
          tracking_error?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      mf_fund_houses: {
        Row: {
          ceo: string | null
          created_at: string
          description: string | null
          founded_year: number | null
          fund_count: number | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          total_aum_cr: number | null
          updated_at: string
        }
        Insert: {
          ceo?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          fund_count?: number | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          total_aum_cr?: number | null
          updated_at?: string
        }
        Update: {
          ceo?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          fund_count?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          total_aum_cr?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      mf_funds: {
        Row: {
          ai_pros: Json | null
          ai_risks: Json | null
          ai_summary: string | null
          ai_verdict: string | null
          alpha: number | null
          aum_cr: number | null
          beta: number | null
          cash_pct: number | null
          category: string
          created_at: string
          debt_pct: number | null
          equity_pct: number | null
          exit_load: string | null
          expense_ratio: number | null
          foreign_pct: number | null
          fund_house: string
          fund_house_slug: string | null
          fund_manager: string | null
          holdings: Json | null
          id: string
          is_elss: boolean | null
          is_nfo: boolean | null
          is_trending: boolean | null
          launch_date: string | null
          meta_description: string | null
          meta_title: string | null
          min_lumpsum: number | null
          min_sip: number | null
          nav: number | null
          nav_date: string | null
          option_type: string | null
          plan_type: string | null
          rating: number | null
          return_10y: number | null
          return_1m: number | null
          return_1y: number | null
          return_3m: number | null
          return_3y: number | null
          return_5y: number | null
          return_6m: number | null
          risk_level: string | null
          scheme_code: string | null
          scheme_name: string
          scheme_type: string | null
          sector_allocation: Json | null
          sharpe: number | null
          slug: string
          sortino: number | null
          std_dev: number | null
          sub_category: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          ai_pros?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          ai_verdict?: string | null
          alpha?: number | null
          aum_cr?: number | null
          beta?: number | null
          cash_pct?: number | null
          category: string
          created_at?: string
          debt_pct?: number | null
          equity_pct?: number | null
          exit_load?: string | null
          expense_ratio?: number | null
          foreign_pct?: number | null
          fund_house: string
          fund_house_slug?: string | null
          fund_manager?: string | null
          holdings?: Json | null
          id?: string
          is_elss?: boolean | null
          is_nfo?: boolean | null
          is_trending?: boolean | null
          launch_date?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_lumpsum?: number | null
          min_sip?: number | null
          nav?: number | null
          nav_date?: string | null
          option_type?: string | null
          plan_type?: string | null
          rating?: number | null
          return_10y?: number | null
          return_1m?: number | null
          return_1y?: number | null
          return_3m?: number | null
          return_3y?: number | null
          return_5y?: number | null
          return_6m?: number | null
          risk_level?: string | null
          scheme_code?: string | null
          scheme_name: string
          scheme_type?: string | null
          sector_allocation?: Json | null
          sharpe?: number | null
          slug: string
          sortino?: number | null
          std_dev?: number | null
          sub_category?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          ai_pros?: Json | null
          ai_risks?: Json | null
          ai_summary?: string | null
          ai_verdict?: string | null
          alpha?: number | null
          aum_cr?: number | null
          beta?: number | null
          cash_pct?: number | null
          category?: string
          created_at?: string
          debt_pct?: number | null
          equity_pct?: number | null
          exit_load?: string | null
          expense_ratio?: number | null
          foreign_pct?: number | null
          fund_house?: string
          fund_house_slug?: string | null
          fund_manager?: string | null
          holdings?: Json | null
          id?: string
          is_elss?: boolean | null
          is_nfo?: boolean | null
          is_trending?: boolean | null
          launch_date?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_lumpsum?: number | null
          min_sip?: number | null
          nav?: number | null
          nav_date?: string | null
          option_type?: string | null
          plan_type?: string | null
          rating?: number | null
          return_10y?: number | null
          return_1m?: number | null
          return_1y?: number | null
          return_3m?: number | null
          return_3y?: number | null
          return_5y?: number | null
          return_6m?: number | null
          risk_level?: string | null
          scheme_code?: string | null
          scheme_name?: string
          scheme_type?: string | null
          sector_allocation?: Json | null
          sharpe?: number | null
          slug?: string
          sortino?: number | null
          std_dev?: number | null
          sub_category?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      mf_industry_stats: {
        Row: {
          id: string
          net_inflows_cr: number | null
          top_gaining_categories: Json | null
          top_losing_categories: Json | null
          total_etf_aum_cr: number | null
          total_mf_aum_cr: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          net_inflows_cr?: number | null
          top_gaining_categories?: Json | null
          top_losing_categories?: Json | null
          total_etf_aum_cr?: number | null
          total_mf_aum_cr?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          net_inflows_cr?: number | null
          top_gaining_categories?: Json | null
          top_losing_categories?: Json | null
          total_etf_aum_cr?: number | null
          total_mf_aum_cr?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      mf_nav_history: {
        Row: {
          created_at: string
          date: string
          fund_id: string | null
          id: string
          nav: number
        }
        Insert: {
          created_at?: string
          date: string
          fund_id?: string | null
          id?: string
          nav: number
        }
        Update: {
          created_at?: string
          date?: string
          fund_id?: string | null
          id?: string
          nav?: number
        }
        Relationships: [
          {
            foreignKeyName: "mf_nav_history_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "mf_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_news: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          id: string
          published_at: string
          slug: string
          source: string | null
          summary: string | null
          title: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string
          slug: string
          source?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string
          slug?: string
          source?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      news_drafts: {
        Row: {
          blog_post_id: string | null
          category: string
          content: string | null
          created_at: string
          featured_image_prompt: string | null
          featured_image_url: string | null
          headline: string
          id: string
          insights: Json
          internal_links: Json
          meta_description: string | null
          meta_keywords: string[]
          meta_title: string | null
          published_at: string | null
          read_time_min: number
          related_searches: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string | null
          schema_jsonld: Json
          seo_score: number
          slug: string
          social_meta: Json
          source_summary: Json
          status: string
          summary: string | null
          tags: string[]
          topic: string
          trending: boolean
          trending_questions: string[] | null
          updated_at: string
        }
        Insert: {
          blog_post_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          featured_image_prompt?: string | null
          featured_image_url?: string | null
          headline: string
          id?: string
          insights?: Json
          internal_links?: Json
          meta_description?: string | null
          meta_keywords?: string[]
          meta_title?: string | null
          published_at?: string | null
          read_time_min?: number
          related_searches?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          schema_jsonld?: Json
          seo_score?: number
          slug: string
          social_meta?: Json
          source_summary?: Json
          status?: string
          summary?: string | null
          tags?: string[]
          topic: string
          trending?: boolean
          trending_questions?: string[] | null
          updated_at?: string
        }
        Update: {
          blog_post_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          featured_image_prompt?: string | null
          featured_image_url?: string | null
          headline?: string
          id?: string
          insights?: Json
          internal_links?: Json
          meta_description?: string | null
          meta_keywords?: string[]
          meta_title?: string | null
          published_at?: string | null
          read_time_min?: number
          related_searches?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          schema_jsonld?: Json
          seo_score?: number
          slug?: string
          social_meta?: Json
          source_summary?: Json
          status?: string
          summary?: string | null
          tags?: string[]
          topic?: string
          trending?: boolean
          trending_questions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_drafts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "news_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      news_runs: {
        Row: {
          completed_at: string | null
          discovered: number
          error: string | null
          failed: number
          generated: number
          id: string
          requested_count: number
          started_at: string
          status: string
          summary: Json
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          discovered?: number
          error?: string | null
          failed?: number
          generated?: number
          id?: string
          requested_count?: number
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          discovered?: number
          error?: string | null
          failed?: number
          generated?: number
          id?: string
          requested_count?: number
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      optimizer_proposals: {
        Row: {
          category: string
          confidence: number
          created_at: string
          field: string
          id: string
          keywords: string[] | null
          new_value: Json | null
          old_value: Json | null
          priority: string
          published_at: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string | null
          status: string
          target_id: string | null
          target_label: string | null
          target_type: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          field: string
          id?: string
          keywords?: string[] | null
          new_value?: Json | null
          old_value?: Json | null
          priority?: string
          published_at?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          field?: string
          id?: string
          keywords?: string[] | null
          new_value?: Json | null
          old_value?: Json | null
          priority?: string
          published_at?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          status?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimizer_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "optimizer_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      optimizer_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          keywords_found: number
          pages_scanned: number
          proposals_created: number
          seo_findings: number
          started_at: string
          status: string
          summary: Json
          trigger_type: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          keywords_found?: number
          pages_scanned?: number
          proposals_created?: number
          seo_findings?: number
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          keywords_found?: number
          pages_scanned?: number
          proposals_created?: number
          seo_findings?: number
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          is_visible: boolean
          page_key: string
          section_type: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          page_key: string
          section_type?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          page_key?: string
          section_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          area_max: number | null
          area_min: number | null
          area_sqft: number | null
          bhk: string | null
          bhk_configurations: Json | null
          bhk_max: string | null
          bhk_min: string | null
          city: string
          cover_image_url: string | null
          cover_images: string[] | null
          created_at: string
          density: string | null
          description: string | null
          developer_name: string | null
          developer_website: string | null
          floor_plans: string[] | null
          green_area_pct: number | null
          highlights: string[] | null
          id: string
          images: string[] | null
          investment_plan: string | null
          is_featured: boolean | null
          is_price_drop: boolean | null
          listing_type: string
          locality: string | null
          meta_description: string | null
          meta_title: string | null
          nearest_hospital: string | null
          nearest_mall: string | null
          nearest_school: string | null
          original_price: number | null
          overview: string | null
          possession_status: string | null
          price: number
          price_display: string | null
          price_history_detail: Json | null
          price_max: number | null
          price_min: number | null
          property_type: string
          rating: number | null
          rera_id: string | null
          rera_status: string | null
          reviews_count: number | null
          roi_projection: string | null
          sector: string | null
          slug: string
          source_urls: string[] | null
          status: string | null
          title: string
          total_floors: number | null
          total_towers: number | null
          updated_at: string
          video_url: string | null
          videos: string[] | null
        }
        Insert: {
          amenities?: string[] | null
          area_max?: number | null
          area_min?: number | null
          area_sqft?: number | null
          bhk?: string | null
          bhk_configurations?: Json | null
          bhk_max?: string | null
          bhk_min?: string | null
          city: string
          cover_image_url?: string | null
          cover_images?: string[] | null
          created_at?: string
          density?: string | null
          description?: string | null
          developer_name?: string | null
          developer_website?: string | null
          floor_plans?: string[] | null
          green_area_pct?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          investment_plan?: string | null
          is_featured?: boolean | null
          is_price_drop?: boolean | null
          listing_type?: string
          locality?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nearest_hospital?: string | null
          nearest_mall?: string | null
          nearest_school?: string | null
          original_price?: number | null
          overview?: string | null
          possession_status?: string | null
          price?: number
          price_display?: string | null
          price_history_detail?: Json | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string
          rating?: number | null
          rera_id?: string | null
          rera_status?: string | null
          reviews_count?: number | null
          roi_projection?: string | null
          sector?: string | null
          slug: string
          source_urls?: string[] | null
          status?: string | null
          title: string
          total_floors?: number | null
          total_towers?: number | null
          updated_at?: string
          video_url?: string | null
          videos?: string[] | null
        }
        Update: {
          amenities?: string[] | null
          area_max?: number | null
          area_min?: number | null
          area_sqft?: number | null
          bhk?: string | null
          bhk_configurations?: Json | null
          bhk_max?: string | null
          bhk_min?: string | null
          city?: string
          cover_image_url?: string | null
          cover_images?: string[] | null
          created_at?: string
          density?: string | null
          description?: string | null
          developer_name?: string | null
          developer_website?: string | null
          floor_plans?: string[] | null
          green_area_pct?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          investment_plan?: string | null
          is_featured?: boolean | null
          is_price_drop?: boolean | null
          listing_type?: string
          locality?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nearest_hospital?: string | null
          nearest_mall?: string | null
          nearest_school?: string | null
          original_price?: number | null
          overview?: string | null
          possession_status?: string | null
          price?: number
          price_display?: string | null
          price_history_detail?: Json | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string
          rating?: number | null
          rera_id?: string | null
          rera_status?: string | null
          reviews_count?: number | null
          roi_projection?: string | null
          sector?: string | null
          slug?: string
          source_urls?: string[] | null
          status?: string | null
          title?: string
          total_floors?: number | null
          total_towers?: number | null
          updated_at?: string
          video_url?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
      re_interior_designs: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      re_price_trends: {
        Row: {
          ai_insights: string | null
          avg_price_sqft: number | null
          change_pct: number | null
          city: string
          created_at: string
          id: string
          locality: string | null
          period: string | null
          trend_data: Json | null
          updated_at: string
        }
        Insert: {
          ai_insights?: string | null
          avg_price_sqft?: number | null
          change_pct?: number | null
          city: string
          created_at?: string
          id?: string
          locality?: string | null
          period?: string | null
          trend_data?: Json | null
          updated_at?: string
        }
        Update: {
          ai_insights?: string | null
          avg_price_sqft?: number | null
          change_pct?: number | null
          city?: string
          created_at?: string
          id?: string
          locality?: string | null
          period?: string | null
          trend_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      re_services: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      refresh_logs: {
        Row: {
          actions: Json
          completed_at: string | null
          id: string
          items_archived: number
          items_created: number
          items_updated: number
          pages_refreshed: number
          rolled_back_at: string | null
          snapshot: Json
          started_at: string
          status: string
          summary: Json
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          actions?: Json
          completed_at?: string | null
          id?: string
          items_archived?: number
          items_created?: number
          items_updated?: number
          pages_refreshed?: number
          rolled_back_at?: string | null
          snapshot?: Json
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          actions?: Json
          completed_at?: string | null
          id?: string
          items_archived?: number
          items_created?: number
          items_updated?: number
          pages_refreshed?: number
          rolled_back_at?: string | null
          snapshot?: Json
          started_at?: string
          status?: string
          summary?: Json
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      seo_audit_findings: {
        Row: {
          check_key: string
          check_label: string
          created_at: string
          details: string | null
          id: string
          page_url: string
          run_id: string | null
          severity: string
          status: string
        }
        Insert: {
          check_key: string
          check_label: string
          created_at?: string
          details?: string | null
          id?: string
          page_url: string
          run_id?: string | null
          severity?: string
          status?: string
        }
        Update: {
          check_key?: string
          check_label?: string
          created_at?: string
          details?: string | null
          id?: string
          page_url?: string
          run_id?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "optimizer_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sitemap_meta: {
        Row: {
          base_url: string
          id: number
          last_added_count: number
          last_generated_at: string | null
          last_updated_at: string | null
          total_urls: number
          updated_at: string
        }
        Insert: {
          base_url?: string
          id?: number
          last_added_count?: number
          last_generated_at?: string | null
          last_updated_at?: string | null
          total_urls?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          id?: number
          last_added_count?: number
          last_generated_at?: string | null
          last_updated_at?: string | null
          total_urls?: number
          updated_at?: string
        }
        Relationships: []
      }
      sitemap_urls: {
        Row: {
          changefreq: string
          first_seen: string
          id: string
          is_active: boolean
          lastmod: string
          path: string
          priority: number
          source: string
          updated_at: string
          url: string
        }
        Insert: {
          changefreq?: string
          first_seen?: string
          id?: string
          is_active?: boolean
          lastmod?: string
          path: string
          priority?: number
          source?: string
          updated_at?: string
          url: string
        }
        Update: {
          changefreq?: string
          first_seen?: string
          id?: string
          is_active?: boolean
          lastmod?: string
          path?: string
          priority?: number
          source?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      stock_reviews: {
        Row: {
          analyst_name: string | null
          company_name: string
          cover_image_url: string | null
          created_at: string
          current_price: number | null
          exchange: string
          financials: Json | null
          id: string
          investment_thesis: string | null
          is_featured: boolean | null
          key_metrics: Json | null
          meta_description: string | null
          meta_title: string | null
          price_history: Json | null
          published_at: string | null
          rating: string | null
          risks: string | null
          sector: string
          status: string | null
          summary: string | null
          symbol: string
          tags: string[] | null
          target_price: number | null
          updated_at: string
          views_count: number | null
        }
        Insert: {
          analyst_name?: string | null
          company_name: string
          cover_image_url?: string | null
          created_at?: string
          current_price?: number | null
          exchange?: string
          financials?: Json | null
          id?: string
          investment_thesis?: string | null
          is_featured?: boolean | null
          key_metrics?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          price_history?: Json | null
          published_at?: string | null
          rating?: string | null
          risks?: string | null
          sector?: string
          status?: string | null
          summary?: string | null
          symbol: string
          tags?: string[] | null
          target_price?: number | null
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          analyst_name?: string | null
          company_name?: string
          cover_image_url?: string | null
          created_at?: string
          current_price?: number | null
          exchange?: string
          financials?: Json | null
          id?: string
          investment_thesis?: string | null
          is_featured?: boolean | null
          key_metrics?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          price_history?: Json | null
          published_at?: string | null
          rating?: string | null
          risks?: string | null
          sector?: string
          status?: string | null
          summary?: string | null
          symbol?: string
          tags?: string[] | null
          target_price?: number | null
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      swing_custom_strategies: {
        Row: {
          created_at: string
          definition: Json
          family_id: string
          id: string
          name: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          definition: Json
          family_id?: string
          id?: string
          name: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          definition?: Json
          family_id?: string
          id?: string
          name?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      swing_deployments: {
        Row: {
          capital: number
          created_at: string
          id: string
          market_filter: boolean
          risk_pct: number
          start_date: string
          status: string
          stopped_at: string | null
          strategy_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capital: number
          created_at?: string
          id?: string
          market_filter?: boolean
          risk_pct?: number
          start_date?: string
          status?: string
          stopped_at?: string | null
          strategy_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capital?: number
          created_at?: string
          id?: string
          market_filter?: boolean
          risk_pct?: number
          start_date?: string
          status?: string
          stopped_at?: string | null
          strategy_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swing_instruments: {
        Row: {
          exchange: string
          name: string
          symbol: string
          token: string
          updated_at: string
        }
        Insert: {
          exchange: string
          name: string
          symbol: string
          token: string
          updated_at?: string
        }
        Update: {
          exchange?: string
          name?: string
          symbol?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      swing_portfolios: {
        Row: {
          capital: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capital?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capital?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swing_prices: {
        Row: {
          close: number
          created_at: string
          high: number
          id: string
          low: number
          open: number
          symbol: string
          trade_date: string
          volume: number
        }
        Insert: {
          close: number
          created_at?: string
          high: number
          id?: string
          low: number
          open: number
          symbol: string
          trade_date: string
          volume?: number
        }
        Update: {
          close?: number
          created_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          symbol?: string
          trade_date?: string
          volume?: number
        }
        Relationships: []
      }
      swing_strategies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          params: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          params?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          params?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      swing_trades: {
        Row: {
          created_at: string
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          id: string
          quantity: number
          status: string
          strategy_id: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          quantity: number
          status?: string
          strategy_id?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          quantity?: number
          status?: string
          strategy_id?: string | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swing_trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "swing_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      swing_universe: {
        Row: {
          added_by: string | null
          created_at: string
          exchange: string
          name: string
          symbol: string
          token: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          exchange?: string
          name: string
          symbol: string
          token: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          exchange?: string
          name?: string
          symbol?: string
          token?: string
        }
        Relationships: []
      }
      trending_keywords: {
        Row: {
          discovered_at: string
          id: string
          keyword: string
          mapped_reason: string | null
          mapped_target_id: string | null
          mapped_target_type: string | null
          run_id: string | null
          source: string
          volume_score: number
        }
        Insert: {
          discovered_at?: string
          id?: string
          keyword: string
          mapped_reason?: string | null
          mapped_target_id?: string | null
          mapped_target_type?: string | null
          run_id?: string | null
          source?: string
          volume_score?: number
        }
        Update: {
          discovered_at?: string
          id?: string
          keyword?: string
          mapped_reason?: string | null
          mapped_target_id?: string | null
          mapped_target_type?: string | null
          run_id?: string | null
          source?: string
          volume_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "trending_keywords_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "optimizer_runs"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor"
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
      app_role: ["admin", "editor"],
    },
  },
} as const
