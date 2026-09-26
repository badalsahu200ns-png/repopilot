import fs from "fs";
import path from "path";
import {
  ComplianceState,
  ComplianceItem,
  ComplianceItemId,
  ComplianceStatus,
  DEFAULT_BOB_VERSION_REQUIREMENT,
} from "@/types/compliance";
import { getAuthenticatedGitHubTokenForUser, getGitHubApiHeaders } from "@/lib/github/client";

/**
 * How each requirement is verified.
 * - automatic: fully determined by server-side checks (filesystem scan, API)
 * - developer:  requires the developer to supply the information manually
 * - mixed:      automatic detection combined with developer-supplied metadata
 */
export type VerificationSource = "automatic" | "developer" | "mixed";

/**
 * Static mapping of each requirement ID to its verification source.
 * This is never user-supplied — it reflects the nature of each check.
 */
export const VERIFICATION_SOURCE: Record<ComplianceItemId, VerificationSource> = {
  bob_sessions:    "automatic",   // Filesystem/GitHub API scan — no developer input needed
  bob_ide:         "developer",   // Version, date, tasks: all developer-provided
  bob_screenshots: "mixed",       // PNG detected automatically; task metadata is developer-provided
  data_compliance: "developer",   // Checklist + source list: entirely developer-entered
  bobcoins:        "developer",   // Balance is developer-provided; cannot be auto-verified
  ibmid:           "developer",   // Email match: developer enters both fields
  bob_version:     "developer",   // Installed version: developer-entered, checked against list
};

/** Human-readable labels for display in the UI */
export const VERIFICATION_SOURCE_LABEL: Record<VerificationSource, string> = {
  automatic: "Automatically detected",
  developer: "Developer verified",
  mixed:     "Mixed verification",
};

/**
 * Determine the local candidate paths for bob_sessions/
 */
function getCandidateBobSessionsPaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "bob_sessions"),
    path.join(cwd, "..", "bob_sessions"),
    path.resolve(cwd, "public", "bob_sessions"),
  ];
}

/**
 * Scan the repository for bob_sessions/ folder and PNG screenshots
 */
export async function scanBobSessionsFolder(opts?: {
  owner?: string;
  repo?: string;
  userId?: string;
}): Promise<{
  folderDetected: boolean;
  folderPath?: string;
  pngCount: number;
  pngFiles: string[];
  status: ComplianceStatus;
  scanMessage: string;
}> {
  const candidatePaths = getCandidateBobSessionsPaths();

  // 1. Check local filesystem paths
  for (const dirPath of candidatePaths) {
    try {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const files = fs.readdirSync(dirPath);
        const pngFiles = files.filter(
          (f) => f.toLowerCase().endsWith(".png") && !f.startsWith(".")
        );

        const status: ComplianceStatus = pngFiles.length > 0 ? "verified" : "needs_attention";
        const scanMessage =
          pngFiles.length > 0
            ? `Found bob_sessions/ directory with ${pngFiles.length} PNG session ${
                pngFiles.length === 1 ? "screenshot" : "screenshots"
              }.`
            : "bob_sessions/ directory detected, but no PNG screenshots found. Add task session summaries before submission.";

        return {
          folderDetected: true,
          folderPath: path.relative(process.cwd(), dirPath) || "bob_sessions/",
          pngCount: pngFiles.length,
          pngFiles,
          status,
          scanMessage,
        };
      }
    } catch {
      // Continue checking next candidate
    }
  }

  // 2. Check remote GitHub repo if credentials and repository are supplied
  if (opts?.owner && opts?.repo && opts?.userId) {
    try {
      const token = await getAuthenticatedGitHubTokenForUser(opts.userId);
      if (token) {
        const headers = getGitHubApiHeaders(token);
        const res = await fetch(
          `https://api.github.com/repos/${opts.owner}/${opts.repo}/contents/bob_sessions`,
          { headers }
        );

        if (res.ok) {
          const items = (await res.json()) as Array<{ name: string; type: string }>;
          if (Array.isArray(items)) {
            const pngFiles = items
              .filter((item) => item.type === "file" && item.name.toLowerCase().endsWith(".png"))
              .map((item) => item.name);

            const status: ComplianceStatus = pngFiles.length > 0 ? "verified" : "needs_attention";
            return {
              folderDetected: true,
              folderPath: `github:${opts.owner}/${opts.repo}/bob_sessions`,
              pngCount: pngFiles.length,
              pngFiles,
              status,
              scanMessage: `Detected bob_sessions/ on GitHub (${opts.owner}/${opts.repo}) with ${pngFiles.length} PNG screenshots.`,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[scanBobSessionsFolder] Remote check failed:", err);
    }
  }

  return {
    folderDetected: false,
    pngCount: 0,
    pngFiles: [],
    status: "needs_attention",
    scanMessage:
      "bob_sessions/ folder not detected at repository root. Create bob_sessions/ and add Bob IDE task session summary screenshots (*.png).",
  };
}

/**
 * Save an uploaded screenshot into the repository's bob_sessions/ folder
 */
export async function saveBobSessionScreenshot(
  fileBuffer: Buffer,
  filename: string
): Promise<{ success: boolean; filename: string; filePath: string; error?: string }> {
  // Validate PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47 &&
    fileBuffer[4] === 0x0d &&
    fileBuffer[5] === 0x0a &&
    fileBuffer[6] === 0x1a &&
    fileBuffer[7] === 0x0a;

  if (!isPng && !filename.toLowerCase().endsWith(".png")) {
    return {
      success: false,
      filename,
      filePath: "",
      error: "Invalid file format. Only genuine PNG screenshots (*.png) are accepted.",
    };
  }

  // Sanitize filename
  const cleanName = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "");
  const finalFilename = cleanName.toLowerCase().endsWith(".png")
    ? cleanName
    : `${cleanName}.png`;

  // Write to bob_sessions at workspace root or repopilot root
  const targetDir = path.join(process.cwd(), "bob_sessions");

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, finalFilename);
    fs.writeFileSync(fullPath, fileBuffer);

    return {
      success: true,
      filename: finalFilename,
      filePath: `bob_sessions/${finalFilename}`,
    };
  } catch (err) {
    return {
      success: false,
      filename: finalFilename,
      filePath: "",
      error: `Failed to save file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Evaluate all 7 compliance requirements without fabricating evidence
 */
export type ComplianceItemWithSource = ComplianceItem & {
  verificationSource: VerificationSource;
  verificationSourceLabel: string;
};

export function evaluateComplianceRequirements(state: ComplianceState): {
  items: ComplianceItemWithSource[];
  readyToSubmit: boolean;
  unresolvedIssues: string[];
  counts: { verified: number; needsAttention: number; notVerified: number };
} {
  const unresolvedIssues: string[] = [];

  // 1. IBM Bob IDE
  let bobIdeStatus: ComplianceStatus = "not_verified";
  const bobIdeEvidence: string[] = [];

  if (state.bobIde.used === false) {
    bobIdeStatus = "needs_attention";
    unresolvedIssues.push("RepoPilot must showcase IBM Bob IDE as a core component");
  } else if (
    state.bobIde.used === true &&
    state.bobIde.version.trim() &&
    state.bobIde.tasksCompleted.trim() &&
    state.bobIde.dateOfUsage.trim()
  ) {
    bobIdeStatus = "verified";
    bobIdeEvidence.push(`Bob IDE version: ${state.bobIde.version}`);
    bobIdeEvidence.push(`Usage date: ${state.bobIde.dateOfUsage}`);
    bobIdeEvidence.push(`Tasks: ${state.bobIde.tasksCompleted}`);
  } else {
    bobIdeStatus = "needs_attention";
    unresolvedIssues.push("IBM Bob IDE development evidence has not been fully verified");
  }

  // 2. bob_sessions Folder
  let bobSessionsStatus: ComplianceStatus = "not_verified";
  const bobSessionsEvidence: string[] = [];

  if (state.bobSessions.folderDetected && state.bobSessions.pngCount > 0) {
    bobSessionsStatus = "verified";
    bobSessionsEvidence.push(`Folder: ${state.bobSessions.folderPath || "bob_sessions/"}`);
    bobSessionsEvidence.push(`${state.bobSessions.pngCount} PNG session summary screenshots found`);
    if (state.bobSessions.pngFiles.length > 0) {
      bobSessionsEvidence.push(`Files: ${state.bobSessions.pngFiles.slice(0, 3).join(", ")}${state.bobSessions.pngFiles.length > 3 ? "..." : ""}`);
    }
  } else if (state.bobSessions.folderDetected && state.bobSessions.pngCount === 0) {
    bobSessionsStatus = "needs_attention";
    unresolvedIssues.push("bob_sessions/ folder exists but contains 0 PNG screenshots");
  } else {
    bobSessionsStatus = "needs_attention";
    unresolvedIssues.push("bob_sessions/ folder is missing from repository root");
  }

  // 3. Bob IDE Screenshots
  let screenshotsStatus: ComplianceStatus = "not_verified";
  const screenshotsEvidence: string[] = [];

  if (state.bobScreenshots.items && state.bobScreenshots.items.length > 0) {
    const validItems = state.bobScreenshots.items.filter(
      (item) => item.taskName.trim() && item.filename.toLowerCase().endsWith(".png") && item.date.trim()
    );

    if (validItems.length > 0) {
      screenshotsStatus = "verified";
      screenshotsEvidence.push(`${validItems.length} Bob IDE task session screenshots recorded`);
      validItems.forEach((item) => {
        screenshotsEvidence.push(`Task: ${item.taskName} (${item.filename})`);
      });
    } else {
      screenshotsStatus = "needs_attention";
      unresolvedIssues.push("Bob IDE screenshot evidence contains incomplete metadata");
    }
  } else {
    screenshotsStatus = "needs_attention";
    unresolvedIssues.push("Bob IDE task session screenshots have not been recorded");
  }

  // 4. Own / Clean Data
  let dataStatus: ComplianceStatus = "not_verified";
  const dataEvidence: string[] = [];
  const checklist = state.dataCompliance.checklist;
  const allChecked =
    checklist.noConfidentialData &&
    checklist.noPersonalData &&
    checklist.noUnauthorizedSocialData &&
    checklist.ownershipVerified &&
    checklist.publicSourcesChecked &&
    checklist.sourcesDocumented;

  const hasSources =
    state.dataCompliance.sources &&
    state.dataCompliance.sources.length > 0 &&
    state.dataCompliance.sources.some((s) => s.verified);

  if (allChecked && hasSources) {
    dataStatus = "verified";
    dataEvidence.push("All 6 data hygiene & compliance checklist items confirmed");
    dataEvidence.push(
      `${state.dataCompliance.sources.length} data ${
        state.dataCompliance.sources.length === 1 ? "source" : "sources"
      } documented and verified`
    );
  } else {
    dataStatus = "needs_attention";
    if (!allChecked) {
      unresolvedIssues.push("Data compliance checklist items are incomplete");
    }
    if (!hasSources) {
      unresolvedIssues.push("No verified data sources documented");
    }
  }

  // 5. Bobcoins
  let bobcoinsStatus: ComplianceStatus = "not_verified";
  const bobcoinsEvidence: string[] = [];

  if (state.bobcoins.used !== null && state.bobcoins.remaining !== null) {
    if (state.bobcoins.remaining < 0) {
      bobcoinsStatus = "needs_attention";
      unresolvedIssues.push("Bobcoin usage exceeds the 40 Bobcoin allocation");
      bobcoinsEvidence.push(`Usage exceeded: ${state.bobcoins.used} used of ${state.bobcoins.allocation}`);
    } else {
      bobcoinsStatus = "verified";
      bobcoinsEvidence.push(
        `Allocation: ${state.bobcoins.allocation} | Used: ${state.bobcoins.used} | Remaining: ${state.bobcoins.remaining}`
      );
      if (state.bobcoins.remaining <= 10) {
        bobcoinsEvidence.push("Note: Low Bobcoin reserve");
      }
    }
  } else {
    bobcoinsStatus = "not_verified";
    unresolvedIssues.push("Bobcoin balance has not been recorded");
  }

  // 6. IBMid
  let ibmidStatus: ComplianceStatus = "not_verified";
  const ibmidEvidence: string[] = [];

  const ibm = state.ibmid.ibmidEmail.trim().toLowerCase();
  const hack = state.ibmid.hackathonEmail.trim().toLowerCase();

  if (ibm && hack) {
    if (ibm === hack) {
      ibmidStatus = "verified";
      ibmidEvidence.push(`IBMid: ${state.ibmid.ibmidEmail}`);
      ibmidEvidence.push(`Hackathon Registration: ${state.ibmid.hackathonEmail}`);
      ibmidEvidence.push("Identity match confirmed");
    } else {
      ibmidStatus = "needs_attention";
      ibmidEvidence.push(`IBMid (${state.ibmid.ibmidEmail}) does not match registration (${state.ibmid.hackathonEmail})`);
      unresolvedIssues.push("IBMid does not match the hackathon registration email");
    }
  } else {
    ibmidStatus = "not_verified";
    unresolvedIssues.push("IBMid and registration email have not been verified");
  }

  // 7. Supported Bob Version
  let bobVersionStatus: ComplianceStatus = "not_verified";
  const bobVersionEvidence: string[] = [];

  const installed = state.bobVersion.installedVersion.trim();
  const supported = state.bobVersion.requirement.supportedVersions || DEFAULT_BOB_VERSION_REQUIREMENT.supportedVersions || [];

  if (installed) {
    if (supported.includes(installed) || supported.some((v) => installed.startsWith(v.slice(0, 3)))) {
      bobVersionStatus = "verified";
      bobVersionEvidence.push(`Installed Bob IDE version: ${installed}`);
      bobVersionEvidence.push(`Supported version group: ${supported.join(", ")}`);
    } else {
      bobVersionStatus = "needs_attention";
      bobVersionEvidence.push(`Installed version ${installed} is not in supported list: ${supported.join(", ")}`);
      unresolvedIssues.push(`Installed Bob IDE version (${installed}) is not officially supported`);
    }
  } else {
    bobVersionStatus = "not_verified";
    unresolvedIssues.push("Installed Bob IDE version has not been verified");
  }

  const baseItems: ComplianceItem[] = [
    {
      id: "bob_ide",
      title: "IBM Bob IDE",
      description: "RepoPilot must showcase IBM Bob IDE as a core component of the solution.",
      status: bobIdeStatus,
      evidence: bobIdeEvidence,
      notes: state.bobIde.notes,
    },
    {
      id: "bob_sessions",
      title: "bob_sessions folder",
      description: "Final repository must contain a bob_sessions/ folder with PNG screenshots of Bob IDE task summaries.",
      status: bobSessionsStatus,
      evidence: bobSessionsEvidence,
    },
    {
      id: "bob_screenshots",
      title: "Bob IDE screenshots",
      description: "Evidence of development tasks captured from Bob IDE session consumption summaries.",
      status: screenshotsStatus,
      evidence: screenshotsEvidence,
    },
    {
      id: "data_compliance",
      title: "Own / clean data",
      description: "Permitted data usage with no client-confidential, personal, or restricted data.",
      status: dataStatus,
      evidence: dataEvidence,
      notes: state.dataCompliance.notes,
    },
    {
      id: "bobcoins",
      title: "Bobcoin budget",
      description: "Participant 40 Bobcoin allocation usage tracking and remaining balance verification.",
      status: bobcoinsStatus,
      evidence: bobcoinsEvidence,
      notes: state.bobcoins.notes,
    },
    {
      id: "ibmid",
      title: "IBMid",
      description: "Verification that IBMid email matches the email registered for the hackathon.",
      status: ibmidStatus,
      evidence: ibmidEvidence,
      notes: state.ibmid.notes,
    },
    {
      id: "bob_version",
      title: "Supported Bob version",
      description: "Use of an officially supported IBM Bob IDE release (2.0.x / 2.x).",
      status: bobVersionStatus,
      evidence: bobVersionEvidence,
      notes: state.bobVersion.notes,
    },
  ];

  // Attach static verification source to every item
  const items: ComplianceItemWithSource[] = baseItems.map((item) => ({
    ...item,
    verificationSource: VERIFICATION_SOURCE[item.id],
    verificationSourceLabel: VERIFICATION_SOURCE_LABEL[VERIFICATION_SOURCE[item.id]],
  }));

  const counts = {
    verified: items.filter((i) => i.status === "verified").length,
    needsAttention: items.filter((i) => i.status === "needs_attention").length,
    notVerified: items.filter((i) => i.status === "not_verified").length,
  };

  const readyToSubmit = items.every((i) => i.status === "verified");

  return {
    items,
    readyToSubmit,
    unresolvedIssues,
    counts,
  };
}

/**
 * Generate exportable Compliance Report matching Requirement 13
 */
export function generateComplianceReport(state: ComplianceState): string {
  const { items, readyToSubmit, unresolvedIssues } = evaluateComplianceRequirements(state);
  const now = new Date().toISOString();

  let md = `# RepoPilot 2.0
# IBM Bob 2.0 Hackathon Readiness Report

**Generated:** ${now}
**Submission Status:** ${readyToSubmit ? "READY TO SUBMIT" : "ACTION REQUIRED"}

---

`;

  items.forEach((item, index) => {
    md += `### ${index + 1}. ${item.title}\n`;
    md += `**Status:** ${item.status.toUpperCase().replace("_", " ")}\n\n`;
    md += `**Requirement:** ${item.description}\n\n`;

    if (item.evidence && item.evidence.length > 0) {
      md += `**Evidence:**\n`;
      item.evidence.forEach((ev) => {
        md += `- ${ev}\n`;
      });
    } else {
      md += `**Evidence:** None provided / Not yet verified\n`;
    }

    if (item.notes) {
      md += `\n**Notes:** ${item.notes}\n`;
    }

    md += `\n---\n\n`;
  });

  md += `### Outstanding Actions\n\n`;
  if (unresolvedIssues.length === 0) {
    md += `✓ All 7 IBM Bob 2.0 Hackathon requirements are verified with genuine evidence.\n`;
    md += `The repository is ready for official submission.\n`;
  } else {
    md += `${unresolvedIssues.length} requirements need attention prior to submission:\n\n`;
    unresolvedIssues.forEach((issue) => {
      md += `• ${issue}\n`;
    });
  }

  md += `\n\n> Note: This report documents verified development evidence for the IBM Bob 2.0 Hackathon. Never fabricate session screenshots or compliance metadata.\n`;

  return md;
}

/**
 * Generate a DATA_SOURCES.md template for the repository
 */
export function generateDataSourcesMarkdown(state: ComplianceState): string {
  let md = `# Data Sources & Compliance Manifesto

**Project:** RepoPilot 2.0
**Hackathon:** IBM Bob 2.0 Hackathon
**Last Updated:** ${new Date().toISOString().split("T")[0]}

## 1. Compliance Statement

RepoPilot 2.0 complies with IBM Bob 2.0 Hackathon guidelines regarding data usage:
- [x] No client or company confidential data included
- [x] No personal data or PII included
- [x] No unauthorized scraped social-media data
- [x] All dataset and source permissions/licenses verified
- [x] Public web sources verified for permitted usage
- [x] Data sources transparently documented

## 2. Documented Data Sources

| Source | Type | Permission / License | Used For | Verified |
| :--- | :--- | :--- | :--- | :--- |
`;

  if (state.dataCompliance.sources.length === 0) {
    md += `| Public GitHub API | REST API | GitHub REST Terms of Service | Repository metadata & file trees | Yes |\n`;
  } else {
    state.dataCompliance.sources.forEach((s) => {
      md += `| ${s.source} | ${s.type} | ${s.permission} | ${s.usedFor} | ${s.verified ? "Yes" : "Pending"} |\n`;
    });
  }

  md += `
## 3. Data Storage & Privacy

- All user data and tokens are held locally in development or in user-scoped authenticated databases.
- OAuth tokens and credentials are never checked into version control.
`;

  return md;
}
