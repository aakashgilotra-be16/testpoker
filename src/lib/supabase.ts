import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      story_creators: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          created_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          title: string;
          description: string;
          final_points: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          final_points?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          final_points?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      voting_sessions: {
        Row: {
          id: string;
          story_id: string | null;
          deck_type: string;
          is_active: boolean;
          votes_revealed: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id?: string | null;
          deck_type?: string;
          is_active?: boolean;
          votes_revealed?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string | null;
          deck_type?: string;
          is_active?: boolean;
          votes_revealed?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          display_name: string;
          vote_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          display_name: string;
          vote_value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          display_name?: string;
          vote_value?: string;
          created_at?: string;
        };
      };
    };
  };
};