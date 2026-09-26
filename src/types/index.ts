// RepoPilot 2.0 — Core Type Definitions
// All domain types for the application

export type ClassificationLevel = "verified" | "inferred" | "recommendation" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";
export type AnalysisStatus = "pending" | "running" | "completed" | "failed";
export type TaskStatus = "draft" | "analyzing" | "planned" | "in_progress" | "verified" | "complete";
export type VerificationStatus = "pending" | "running" | "passed" | "failed" | "skipped";
export type BobMode = "ask" | "plan" | "code" | "review" | "orchestrator";

// ── Evidence System ──────────────────────────────────────────
export interface Evidence {
  file: string;
  symbol?: string;
  lineStart?: number;
  lineEnd?: number;
  excerpt?: string;
}

export interface ClassifiedOutput {
  content: string;
  classification: ClassificationLevel;
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  recommendations?: string[];
}

// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

// ── Repository ───────────────────────────────────────────────
export interface Repository {
  id: string;
  userId: string;
  githubUrl: string;
  githubOwner: string;
  githubRepo: string;
  name: string;
  description?: string;
  defaultBranch: string;
  language?: string;
  analysisStatus: AnalysisStatus;
  analyzedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepositorySnapshot {
  id: string;
  repositoryId: string;
  commitSha?: string;
  branch: string;
  fileCount: number;
  languageBreakdown: Record<string, number>; // language → percentage
  frameworkDetected: DetectedFramework[];
  architecture: ArchitectureSummary;
  techStack: TechStack;
  risks: Risk[];
  createdAt: string;
}

export interface DetectedFramework {
  name: string;
  version?: string;
  confidence: ConfidenceLevel;
  evidence: string[]; // file paths that indicate this framework
}

export interface TechStack {
  languages: Language[];
  frameworks: DetectedFramework[];
  packageManagers: string[];
  databases?: string[];
  infrastructure?: string[];
}

export interface Language {
  name: string;
  percentage: number;
  fileCount: number;
}

export interface ArchitectureSummary {
  overview: string;
  layers: ArchitectureLayer[];
  keyModules: ArchitectureModule[];
  classification: ClassificationLevel;
}

export interface ArchitectureLayer {
  name: string;
  description: string;
  path?: string;
  technologies: string[];
}

export interface ArchitectureModule {
  id: string;
  name: string;
  description: string;
  type: "service" | "library" | "ui" | "api" | "database" | "config" | "test" | "other";
  path?: string;
  files: string[];
  dependencies: string[]; // module IDs
  dependents: string[]; // module IDs
  classification: ClassificationLevel;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: ArchitectureModule["type"];
  path?: string;
  description: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: "depends_on" | "imports" | "extends" | "calls";
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  classification: ClassificationLevel;
  affectedFiles?: string[];
}

// ── Repository File ──────────────────────────────────────────
export interface RepositoryFile {
  id: string;
  repositoryId: string;
  path: string;
  language?: string;
  sizeBytes?: number;
  isTest: boolean;
  isDoc: boolean;
}

// ── Conversation / Ask ───────────────────────────────────────
export interface Conversation {
  id: string;
  repositoryId: string;
  userId: string;
  title?: string;
  messages: ConversationMessage[];
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  classification?: ClassificationLevel;
  confidence?: ConfidenceLevel;
  evidence?: Evidence[];
  createdAt: string;
}

// ── Task ─────────────────────────────────────────────────────
export interface Task {
  id: string;
  repositoryId: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  impactAnalysis?: ImpactAnalysis;
  plan?: TaskPlan;
  createdAt: string;
  updatedAt: string;
}

export interface ImpactAnalysis {
  affectedModules: AffectedModule[];
  affectedFiles: AffectedFile[];
  dependencies: DependencyImpact[];
  risks: Risk[];
  classification: ClassificationLevel;
  confidence: ConfidenceLevel;
}

export interface AffectedModule {
  moduleId: string;
  moduleName: string;
  impactType: "primary" | "secondary" | "testing";
  reasoning: string;
  classification: ClassificationLevel;
}

export interface AffectedFile {
  path: string;
  changeType: "modify" | "create" | "delete" | "test";
  reasoning: string;
  classification: ClassificationLevel;
}

export interface DependencyImpact {
  name: string;
  type: "internal" | "external";
  impact: string;
  classification: ClassificationLevel;
}

export interface TaskPlan {
  id: string;
  taskId: string;
  steps: PlanStep[];
  generatedBy: "repopilot" | "bob";
  bobPlanId?: string;
  createdAt: string;
}

export interface PlanStep {
  number: number;
  title: string;
  description: string;
  files: string[];
  status: "pending" | "active" | "complete" | "skipped";
  classification: ClassificationLevel;
  dependsOn?: number[];
  verification?: string;
}

// ── Verification ─────────────────────────────────────────────
export interface VerificationRun {
  id: string;
  taskId?: string;
  repositoryId: string;
  userId: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
  createdAt: string;
  completedAt?: string;
}

export interface VerificationCheck {
  name: string;
  status: VerificationStatus;
  output?: string;
  errorOutput?: string;
  durationMs?: number;
}

// ── IBM Bob ──────────────────────────────────────────────────
export interface BobRequest {
  mode: BobMode;
  task?: string;
  repositoryContext?: string; // AGENTS.md content
  codebaseContext?: string;
  planId?: string;
  step?: PlanStep;
  filePaths?: string[];
}

export interface BobResponse {
  mode: BobMode;
  success: boolean;
  content: string;
  planId?: string;
  steps?: PlanStep[];
  filesToModify?: string[];
  risks?: string[];
  securityFindings?: string[];
  error?: string;
}

// ── API Responses ─────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Analytics Events ──────────────────────────────────────────
export type AnalyticsEvent =
  | "USER_SIGNED_UP"
  | "USER_LOGGED_IN"
  | "REPOSITORY_CONNECTED"
  | "REPOSITORY_ANALYSIS_STARTED"
  | "REPOSITORY_ANALYSIS_COMPLETED"
  | "REPOSITORY_ANALYSIS_FAILED"
  | "ARCHITECTURE_VIEWED"
  | "CODE_SEARCHED"
  | "REPOSITORY_QUESTION_ASKED"
  | "AI_RESULT_ACCEPTED"
  | "AI_RESULT_REJECTED"
  | "TASK_CREATED"
  | "TASK_IMPACT_ANALYZED"
  | "TASK_PLAN_GENERATED"
  | "TASK_PLAN_ACCEPTED"
  | "CODE_CHANGE_STARTED"
  | "CODE_CHANGE_COMPLETED"
  | "VERIFICATION_STARTED"
  | "VERIFICATION_COMPLETED"
  | "VERIFICATION_FAILED"
  | "CONTRIBUTION_VERIFIED"
  | "BOB_PLAN_REQUESTED"
  | "BOB_CODE_REQUESTED"
  | "BOB_REVIEW_REQUESTED"
  | "ACCOUNT_DELETED";

export * from "./compliance";
