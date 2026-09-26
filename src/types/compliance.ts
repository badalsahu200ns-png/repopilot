// RepoPilot 2.0 — IBM Bob 2.0 Hackathon Compliance Types
// Structured models for compliance evidence tracking

export type ComplianceStatus = "verified" | "needs_attention" | "not_verified";

export type ComplianceItemId =
  | "bob_ide"
  | "bob_sessions"
  | "bob_screenshots"
  | "data_compliance"
  | "bobcoins"
  | "ibmid"
  | "bob_version";

export interface ComplianceItem {
  id: ComplianceItemId;
  title: string;
  description: string;
  status: ComplianceStatus;
  evidence?: string[];
  notes?: string;
  updatedAt?: string;
}

export interface BobVersionRequirement {
  minimumVersion?: string;
  supportedVersions?: string[];
  notes?: string;
}

export const DEFAULT_BOB_VERSION_REQUIREMENT: BobVersionRequirement = {
  minimumVersion: "2.0.0",
  supportedVersions: ["2.0.0", "2.0.1", "2.0.2", "2.1.0"],
  notes: "Official IBM Bob 2.0 Hackathon requires a supported 2.0.x/2.x Bob IDE release.",
};

export interface BobScreenshotEvidence {
  id: string;
  taskName: string;
  filename: string;
  description: string;
  date: string;
  notes?: string;
  fileSize?: number;
  url?: string;
}

export interface DataSourceRecord {
  id: string;
  source: string;
  type: string;
  permission: string;
  usedFor: string;
  verified: boolean;
}

export interface DataComplianceChecklist {
  noConfidentialData: boolean;
  noPersonalData: boolean;
  noUnauthorizedSocialData: boolean;
  ownershipVerified: boolean;
  publicSourcesChecked: boolean;
  sourcesDocumented: boolean;
}

export interface BobIdeEvidenceState {
  used: boolean | null;
  version: string;
  dateOfUsage: string;
  tasksCompleted: string;
  notes: string;
  status: ComplianceStatus;
}

export interface BobSessionsFolderState {
  folderDetected: boolean;
  folderPath?: string;
  pngCount: number;
  pngFiles: string[];
  status: ComplianceStatus;
  checkedAt?: string;
  scanMessage?: string;
}

export interface BobScreenshotsState {
  items: BobScreenshotEvidence[];
  status: ComplianceStatus;
}

export interface DataComplianceState {
  checklist: DataComplianceChecklist;
  sources: DataSourceRecord[];
  status: ComplianceStatus;
  notes?: string;
}

export interface BobcoinBudgetState {
  allocation: number;
  used: number | null;
  remaining: number | null;
  status: ComplianceStatus;
  notes?: string;
}

export interface IbmidVerificationState {
  ibmidEmail: string;
  hackathonEmail: string;
  status: ComplianceStatus;
  matchStatus: "verified" | "mismatch" | "not_verified";
  notes?: string;
}

export interface BobVersionState {
  installedVersion: string;
  requirement: BobVersionRequirement;
  status: ComplianceStatus;
  notes?: string;
}

export interface ComplianceState {
  bobIde: BobIdeEvidenceState;
  bobSessions: BobSessionsFolderState;
  bobScreenshots: BobScreenshotsState;
  dataCompliance: DataComplianceState;
  bobcoins: BobcoinBudgetState;
  ibmid: IbmidVerificationState;
  bobVersion: BobVersionState;
  lastUpdated?: string;
}

export const INITIAL_COMPLIANCE_STATE: ComplianceState = {
  bobIde: {
    used: null,
    version: "",
    dateOfUsage: "",
    tasksCompleted: "",
    notes: "",
    status: "not_verified",
  },
  bobSessions: {
    folderDetected: false,
    pngCount: 0,
    pngFiles: [],
    status: "not_verified",
  },
  bobScreenshots: {
    items: [],
    status: "not_verified",
  },
  dataCompliance: {
    checklist: {
      noConfidentialData: false,
      noPersonalData: false,
      noUnauthorizedSocialData: false,
      ownershipVerified: false,
      publicSourcesChecked: false,
      sourcesDocumented: false,
    },
    sources: [],
    status: "not_verified",
  },
  bobcoins: {
    allocation: 40,
    used: null,
    remaining: null,
    status: "not_verified",
  },
  ibmid: {
    ibmidEmail: "",
    hackathonEmail: "",
    status: "not_verified",
    matchStatus: "not_verified",
  },
  bobVersion: {
    installedVersion: "",
    requirement: DEFAULT_BOB_VERSION_REQUIREMENT,
    status: "not_verified",
  },
};
