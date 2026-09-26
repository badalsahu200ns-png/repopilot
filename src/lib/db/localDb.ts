import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  auth_provider?: "local" | "github";
  github_user_id?: string | null;
  avatar_url?: string | null;
  github_access_token?: string | null;
}

export interface DbRepository {
  id: string;
  user_id: string;
  github_url: string;
  github_owner: string;
  github_repo: string;
  name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  analysis_status: "pending" | "running" | "completed" | "failed";
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSnapshot {
  id: string;
  repository_id: string;
  branch: string;
  file_count: number;
  language_breakdown: Record<string, number>;
  framework_detected: unknown[];
  architecture: unknown;
  tech_stack: unknown;
  risks: unknown[];
  created_at: string;
}

export interface DbFile {
  id: string;
  repository_id: string;
  path: string;
  language: string | null;
  is_test: boolean;
  is_doc: boolean;
  created_at: string;
}

export interface DbTask {
  id: string;
  repository_id: string;
  user_id: string;
  title: string;
  description: string;
  status: "created" | "planned" | "in_progress" | "complete" | "failed";
  impact_analysis?: unknown;
  created_at: string;
  updated_at: string;
}

export interface DbPlan {
  id: string;
  task_id: string;
  steps: unknown;
  generated_by: string;
  bob_plan_id: string | null;
  created_at: string;
}

export interface DbComplianceRecord {
  id: string;
  user_id: string;
  repository_id?: string | null;
  state: unknown;
  created_at: string;
  updated_at: string;
}

export interface LocalDatabaseSchema {
  users: DbUser[];
  repositories: DbRepository[];
  repository_snapshots: DbSnapshot[];
  repository_files: DbFile[];
  tasks: DbTask[];
  task_plans: DbPlan[];
  conversations: unknown[];
  conversation_messages: unknown[];
  compliance_records?: DbComplianceRecord[];
}

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "repopilot-dev.json");

function getDefaultData(): LocalDatabaseSchema {
  return {
    users: [],
    repositories: [],
    repository_snapshots: [],
    repository_files: [],
    tasks: [],
    task_plans: [],
    conversations: [],
    conversation_messages: [],
    compliance_records: [],
  };
}

let inMemoryDb: LocalDatabaseSchema | null = null;

export function getLocalDb(): LocalDatabaseSchema {
  if (inMemoryDb) {
    if (!inMemoryDb.compliance_records) {
      inMemoryDb.compliance_records = [];
    }
    return inMemoryDb;
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      inMemoryDb = JSON.parse(raw);
      if (!inMemoryDb!.compliance_records) {
        inMemoryDb!.compliance_records = [];
      }
    } else {
      inMemoryDb = getDefaultData();
      fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[LocalDb] Failed to read disk DB, initializing memory store:", err);
    inMemoryDb = inMemoryDb || getDefaultData();
  }

  if (!inMemoryDb!.compliance_records) {
    inMemoryDb!.compliance_records = [];
  }

  return inMemoryDb!;
}

export function saveLocalDb(): void {
  if (!inMemoryDb) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), "utf-8");
  } catch (err) {
    console.error("[LocalDb] Failed to write DB file:", err);
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}
