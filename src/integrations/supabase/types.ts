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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          sequence_number: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
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
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          sequence_number?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
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
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          sequence_number?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
