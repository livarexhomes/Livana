export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      landlords: {
        Row: {
          id: string
          user_id: string
          full_name: string
          whatsapp: string
          bio: string | null
          avatar_url: string | null
          city: string | null
          nin: string | null
          id_type: string | null
          id_number: string | null
          state: string | null
          kyc_notes: string | null
          kyc_submitted_at: string | null
          years_experience: string | null
          specialization: string | null
          website: string | null
          linkedin: string | null
          twitter: string | null
          instagram: string | null
          status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended'
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          whatsapp: string
          bio?: string | null
          avatar_url?: string | null
          city?: string | null
          nin?: string | null
          id_type?: string | null
          id_number?: string | null
          state?: string | null
          kyc_notes?: string | null
          kyc_submitted_at?: string | null
          years_experience?: string | null
          specialization?: string | null
          website?: string | null
          linkedin?: string | null
          twitter?: string | null
          instagram?: string | null
          status?: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended'
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          whatsapp?: string
          bio?: string | null
          avatar_url?: string | null
          city?: string | null
          nin?: string | null
          id_type?: string | null
          id_number?: string | null
          state?: string | null
          kyc_notes?: string | null
          kyc_submitted_at?: string | null
          years_experience?: string | null
          specialization?: string | null
          website?: string | null
          linkedin?: string | null
          twitter?: string | null
          instagram?: string | null
          status?: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended'
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          landlord_id: string | null
          title: string
          description: string | null
          address: string
          city: string
          price: number
          agreement_fee: number | null
          commission_fee: number | null
          other_charges: number | null
          bedrooms: number
          bathrooms: number
          area_sqft: number | null
          type: 'sale' | 'rent'
          status: 'available' | 'taken' | 'coming_soon' | 'under_negotiation'
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          landlord_id?: string | null
          title: string
          description?: string | null
          address: string
          city: string
          price: number
          agreement_fee?: number | null
          commission_fee?: number | null
          other_charges?: number | null
          bedrooms: number
          bathrooms: number
          area_sqft?: number | null
          type: 'sale' | 'rent'
          status?: 'available' | 'taken' | 'coming_soon' | 'under_negotiation'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          landlord_id?: string | null
          title?: string
          description?: string | null
          address?: string
          city?: string
          price?: number
          agreement_fee?: number | null
          commission_fee?: number | null
          other_charges?: number | null
          bedrooms?: number
          bathrooms?: number
          area_sqft?: number | null
          type?: 'sale' | 'rent'
          status?: 'available' | 'taken' | 'coming_soon' | 'under_negotiation'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      property_images: {
        Row: {
          id: string
          property_id: string
          storage_path: string
          alt_text: string | null
          is_cover: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          storage_path: string
          alt_text?: string | null
          is_cover?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          storage_path?: string
          alt_text?: string | null
          is_cover?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      saved_properties: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          created_at?: string
        }
      }
      enquiries: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          landlord_id: string | null
          message: string
          status: 'open' | 'replied' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          landlord_id?: string | null
          message: string
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          landlord_id?: string | null
          message?: string
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          role: string | null
          subject: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: string | null
          subject: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string | null
          subject?: string
          message?: string
          created_at?: string
        }
      }
      chat_inquiries: {
        Row: {
          id: string
          name: string
          note: string
          phone: string | null
          email: string | null
          visitor_id: string | null
          read_by_admin: boolean
          ticket_no: string | null
          agent_id: string | null
          agent_status: 'unassigned' | 'queued' | 'assigned'
          status: 'open' | 'replied' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          note: string
          phone?: string | null
          email?: string | null
          visitor_id?: string | null
          read_by_admin?: boolean
          ticket_no?: string | null
          agent_id?: string | null
          agent_status?: 'unassigned' | 'queued' | 'assigned'
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          note?: string
          phone?: string | null
          email?: string | null
          visitor_id?: string | null
          read_by_admin?: boolean
          ticket_no?: string | null
          agent_id?: string | null
          agent_status?: 'unassigned' | 'queued' | 'assigned'
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          inquiry_id: string
          sender: 'visitor' | 'admin'
          body: string
          read_by_admin: boolean
          read_by_visitor: boolean
          attachment_url: string | null
          attachment_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          sender: 'visitor' | 'admin'
          body: string
          read_by_admin?: boolean
          read_by_visitor?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          sender?: 'visitor' | 'admin'
          body?: string
          read_by_admin?: boolean
          read_by_visitor?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          role: 'agent' | 'support' | 'admin'
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          role?: 'agent' | 'support' | 'admin'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          role?: 'agent' | 'support' | 'admin'
          active?: boolean
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
