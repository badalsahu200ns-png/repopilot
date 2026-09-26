// Supabase Database Types — placeholder until Supabase CLI generates them
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string;
          user_id: string;
          github_url: string;
          github_owner: string;
          github_repo: string;
          name: string;
          description: string | null;
          default_branch: string;
          language: string | null;
          analysis_status: string;
          analyzed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          github_url: string;
          github_owner: string;
          github_repo: string;
          name: string;
          description?: string | null;
          default_branch?: string;
          language?: string | null;
          analysis_status?: string;
          analyzed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          github_url?: string;
          github_owner?: string;
          github_repo?: string;
          name?: string;
          description?: string | null;
          default_branch?: string;
          language?: string | null;
          analysis_status?: string;
          analyzed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      repository_snapshots: {
        Row: {
          id: string;
          repository_id: string;
          commit_sha: string | null;
          branch: string;
          file_count: number;
          language_breakdown: Json;
          framework_detected: Json;
          architecture: Json;
          tech_stack: Json;
          risks: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          commit_sha?: string | null;
          branch?: string;
          file_count?: number;
          language_breakdown?: Json;
          framework_detected?: Json;
          architecture?: Json;
          tech_stack?: Json;
          risks?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          commit_sha?: string | null;
          branch?: string;
          file_count?: number;
          language_breakdown?: Json;
          framework_detected?: Json;
          architecture?: Json;
          tech_stack?: Json;
          risks?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repository_snapshots_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          }
        ];
      };
      repository_files: {
        Row: {
          id: string;
          repository_id: string;
          path: string;
          language: string | null;
          is_test: boolean;
          is_doc: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          path: string;
          language?: string | null;
          is_test?: boolean;
          is_doc?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          path?: string;
          language?: string | null;
          is_test?: boolean;
          is_doc?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repository_files_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          repository_id: string;
          user_id: string;
          title: string;
          description: string;
          status: string;
          impact_analysis: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          user_id: string;
          title: string;
          description?: string;
          status?: string;
          impact_analysis?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          status?: string;
          impact_analysis?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          }
        ];
      };
      task_plans: {
        Row: {
          id: string;
          task_id: string;
          steps: Json;
          generated_by: string;
          bob_plan_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          steps?: Json;
          generated_by?: string;
          bob_plan_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          steps?: Json;
          generated_by?: string;
          bob_plan_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_plans_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          repository_id: string;
          user_id: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          }
        ];
      };
      conversation_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          classification: string | null;
          confidence: string | null;
          evidence: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          classification?: string | null;
          confidence?: string | null;
          evidence?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          classification?: string | null;
          confidence?: string | null;
          evidence?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      verification_runs: {
        Row: {
          id: string;
          task_id: string | null;
          repository_id: string;
          user_id: string;
          status: string;
          checks: Json;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          repository_id: string;
          user_id: string;
          status?: string;
          checks?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          repository_id?: string;
          user_id?: string;
          status?: string;
          checks?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_runs_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          }
        ];
      };
      compliance_records: {
        Row: {
          id:         string;
          user_id:    string;
          state:      Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?:         string;
          user_id:     string;
          state?:      Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?:         string;
          user_id?:    string;
          state?:      Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
