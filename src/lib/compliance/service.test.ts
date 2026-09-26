/**
 * RepoPilot 2.0 — Compliance Service Tests
 *
 * Self-contained test file for pure compliance functions.
 * No external test framework required.
 *
 * Run:  npx tsx src/lib/compliance/service.test.ts
 *
 * Tests use deterministic fixtures and temporary directories.
 * The real bob_sessions/ folder is never touched.
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
  evaluateComplianceRequirements,
  generateComplianceReport,
  VERIFICATION_SOURCE,
  VERIFICATION_SOURCE_LABEL,
} from "./service";
import {
  ComplianceState,
  INITIAL_COMPLIANCE_STATE,
} from "../../types/compliance";

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  assert(
    actual === expected,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<ComplianceState> = {}): ComplianceState {
  return { ...INITIAL_COMPLIANCE_STATE, ...overrides };
}

const VERIFIED_BOB_IDE: ComplianceState["bobIde"] = {
  used: true,
  version: "2.0.2",
  dateOfUsage: "2025-01-15",
  tasksCompleted: "Architecture planning, API implementation, test review",
  notes: "Used Bob for all major implementation tasks",
  status: "not_verified",
};

const FOLDER_DETECTED_WITH_PNGS: ComplianceState["bobSessions"] = {
  folderDetected: true,
  folderPath: "bob_sessions",
  pngCount: 3,
  pngFiles: ["task-01.png", "task-02.png", "task-03.png"],
  status: "verified",
};

const FOLDER_DETECTED_EMPTY: ComplianceState["bobSessions"] = {
  folderDetected: true,
  folderPath: "bob_sessions",
  pngCount: 0,
  pngFiles: [],
  status: "needs_attention",
};

const FOLDER_MISSING: ComplianceState["bobSessions"] = {
  folderDetected: false,
  pngCount: 0,
  pngFiles: [],
  status: "needs_attention",
};

const VALID_SCREENSHOT: ComplianceState["bobScreenshots"]["items"][0] = {
  id: "screenshot-1",
  taskName: "Architecture planning",
  filename: "task-01.png",
  description: "Session summary from Bob IDE",
  date: "2025-01-15",
};

const VALID_DATA_COMPLIANCE: ComplianceState["dataCompliance"] = {
  checklist: {
    noConfidentialData: true,
    noPersonalData: true,
    noUnauthorizedSocialData: true,
    ownershipVerified: true,
    publicSourcesChecked: true,
    sourcesDocumented: true,
  },
  sources: [
    {
      id: "src-1",
      source: "GitHub REST API",
      type: "REST API",
      permission: "Public / Open Source License",
      usedFor: "Repository file tree and metadata",
      verified: true,
    },
  ],
  status: "not_verified",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log("\nRepoPilot Compliance Service Tests\n");

// Test 1 — All requirements unverified on initial state
test("Test 1 — All requirements return not_verified or needs_attention on initial state", () => {
  const result = evaluateComplianceRequirements(INITIAL_COMPLIANCE_STATE);
  assert(result.items.length === 7, "Should return 7 requirement items");
  assert(!result.readyToSubmit, "Initial state should not be ready to submit");
  const verified = result.items.filter((i) => i.status === "verified");
  assertEqual(verified.length, 0, "Verified count on initial state");
  assert(result.unresolvedIssues.length > 0, "Should have unresolved issues on initial state");
});

// Test 2 — Bob IDE verified when all fields present
test("Test 2 — bob_ide verified when used=true with version, date, and tasks", () => {
  const state = makeState({ bobIde: VERIFIED_BOB_IDE });
  const result = evaluateComplianceRequirements(state);
  const bobIde = result.items.find((i) => i.id === "bob_ide");
  assert(bobIde !== undefined, "bob_ide item must exist");
  assertEqual(bobIde!.status, "verified", "bob_ide status");
  assert(
    bobIde!.evidence!.some((e) => e.includes("2.0.2")),
    "Evidence should contain the version"
  );
});

// Test 3 — bob_sessions missing
test("Test 3 — bob_sessions needs_attention when folder not detected", () => {
  const state = makeState({ bobSessions: FOLDER_MISSING });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_sessions");
  assertEqual(item!.status, "needs_attention", "bob_sessions status when folder missing");
  assert(
    result.unresolvedIssues.some((i) => i.toLowerCase().includes("missing") || i.toLowerCase().includes("bob_sessions")),
    "Unresolved issues should mention bob_sessions"
  );
});

// Test 4 — bob_sessions folder exists with PNGs → verified
test("Test 4 — bob_sessions verified when folder detected with PNG files", () => {
  const state = makeState({ bobSessions: FOLDER_DETECTED_WITH_PNGS });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_sessions");
  assertEqual(item!.status, "verified", "bob_sessions status with PNGs present");
});

// Test 5 — PNG screenshot detection
test("Test 5 — bob_screenshots verified with valid screenshot metadata", () => {
  const state = makeState({
    bobScreenshots: {
      items: [VALID_SCREENSHOT],
      status: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_screenshots");
  assertEqual(item!.status, "verified", "bob_screenshots status with valid screenshot");
});

// Test 6 — Zero screenshots
test("Test 6 — bob_screenshots needs_attention when no screenshots recorded", () => {
  const state = makeState({
    bobScreenshots: { items: [], status: "not_verified" },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_screenshots");
  assert(item!.status !== "verified", "bob_screenshots should not be verified with 0 screenshots");
});

// Test 7 — Multiple screenshots all valid
test("Test 7 — bob_screenshots verified with multiple valid screenshots", () => {
  const state = makeState({
    bobScreenshots: {
      items: [
        VALID_SCREENSHOT,
        { ...VALID_SCREENSHOT, id: "screenshot-2", taskName: "API implementation", filename: "task-02.png", date: "2025-01-16" },
        { ...VALID_SCREENSHOT, id: "screenshot-3", taskName: "Test review",        filename: "task-03.png", date: "2025-01-17" },
      ],
      status: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_screenshots");
  assertEqual(item!.status, "verified", "bob_screenshots status with 3 valid screenshots");
  assert(item!.evidence!.some((e) => e.includes("3")), "Evidence should mention count of 3");
});

// Test 8 — Bobcoin calculation: 40 - 15 = 25 remaining
test("Test 8 — Bobcoin remaining is allocation minus used", () => {
  const state = makeState({
    bobcoins: {
      allocation: 40,
      used: 15,
      remaining: 25,
      status: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bobcoins");
  assertEqual(item!.status, "verified", "bobcoins status when within budget");
  assert(item!.evidence!.some((e) => e.includes("15")), "Evidence should include used amount");
  assert(item!.evidence!.some((e) => e.includes("25")), "Evidence should include remaining amount");
});

// Test 9 — Bobcoin over-budget flagged
test("Test 9 — Bobcoin needs_attention when used exceeds allocation", () => {
  const state = makeState({
    bobcoins: {
      allocation: 40,
      used: 45,
      remaining: -5,
      status: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bobcoins");
  assertEqual(item!.status, "needs_attention", "bobcoins status when over budget");
  assert(
    result.unresolvedIssues.some((i) => i.toLowerCase().includes("bobcoin") || i.toLowerCase().includes("allocation")),
    "Unresolved issues should mention Bobcoin budget"
  );
});

// Test 10 — IBMid match → verified
test("Test 10 — ibmid verified when both emails match (case-insensitive)", () => {
  const state = makeState({
    ibmid: {
      ibmidEmail: "developer@example.ibm.com",
      hackathonEmail: "Developer@Example.IBM.COM",
      status: "not_verified",
      matchStatus: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "ibmid");
  assertEqual(item!.status, "verified", "ibmid status when emails match");
});

// Test 11 — IBMid mismatch → needs_attention
test("Test 11 — ibmid needs_attention when emails differ", () => {
  const state = makeState({
    ibmid: {
      ibmidEmail: "developer@ibm.com",
      hackathonEmail: "different@example.com",
      status: "not_verified",
      matchStatus: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "ibmid");
  assertEqual(item!.status, "needs_attention", "ibmid status when emails differ");
});

// Test 12 — Supported Bob version
test("Test 12 — bob_version verified when installed version is in supported list", () => {
  const state = makeState({
    bobVersion: {
      installedVersion: "2.0.2",
      requirement: { supportedVersions: ["2.0.0", "2.0.1", "2.0.2", "2.1.0"] },
      status: "not_verified",
    },
  });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_version");
  assertEqual(item!.status, "verified", "bob_version status when version is supported");
});

// Test 13 — VERIFICATION_SOURCE map: bob_sessions is automatic, ibmid is developer, screenshots is mixed
test("Test 13 — VERIFICATION_SOURCE assigns correct sources to each requirement", () => {
  assertEqual(VERIFICATION_SOURCE.bob_sessions, "automatic",   "bob_sessions source");
  assertEqual(VERIFICATION_SOURCE.bob_ide,      "developer",   "bob_ide source");
  assertEqual(VERIFICATION_SOURCE.bob_screenshots, "mixed",    "bob_screenshots source");
  assertEqual(VERIFICATION_SOURCE.data_compliance, "developer","data_compliance source");
  assertEqual(VERIFICATION_SOURCE.bobcoins,     "developer",   "bobcoins source");
  assertEqual(VERIFICATION_SOURCE.ibmid,        "developer",   "ibmid source");
  assertEqual(VERIFICATION_SOURCE.bob_version,  "developer",   "bob_version source");

  // Verify evaluateComplianceRequirements attaches source labels
  const result = evaluateComplianceRequirements(INITIAL_COMPLIANCE_STATE);
  const bobSessions = result.items.find((i) => i.id === "bob_sessions");
  assertEqual(bobSessions!.verificationSource,      "automatic",          "bob_sessions verificationSource");
  assertEqual(bobSessions!.verificationSourceLabel, VERIFICATION_SOURCE_LABEL["automatic"], "bob_sessions label");
});

// Test 14 — Fully verified state
test("Test 14 — readyToSubmit=true only when all 7 items are verified", () => {
  const fullyVerifiedState: ComplianceState = {
    bobIde:         VERIFIED_BOB_IDE,
    bobSessions:    FOLDER_DETECTED_WITH_PNGS,
    bobScreenshots: { items: [VALID_SCREENSHOT], status: "verified" },
    dataCompliance: VALID_DATA_COMPLIANCE,
    bobcoins:       { allocation: 40, used: 10, remaining: 30, status: "verified" },
    ibmid:          { ibmidEmail: "dev@ibm.com", hackathonEmail: "dev@ibm.com", status: "verified", matchStatus: "verified" },
    bobVersion:     { installedVersion: "2.0.2", requirement: { supportedVersions: ["2.0.0","2.0.1","2.0.2","2.1.0"] }, status: "verified" },
  };
  const result = evaluateComplianceRequirements(fullyVerifiedState);
  assert(result.readyToSubmit, "readyToSubmit should be true when all 7 requirements are verified");
  assertEqual(result.counts.verified, 7, "All 7 items should be verified");
  assertEqual(result.unresolvedIssues.length, 0, "No unresolved issues when fully verified");
});

// Test 15 — Outstanding requirements list is accurate
test("Test 15 — unresolvedIssues lists all outstanding items", () => {
  // State with only bob_ide filled — 6 should be unresolved
  const partialState = makeState({ bobIde: VERIFIED_BOB_IDE });
  const result = evaluateComplianceRequirements(partialState);
  // bob_ide is verified, the other 6 should all produce unresolved issues
  assert(result.unresolvedIssues.length >= 5, "Should report at least 5 outstanding items");
  assert(
    result.unresolvedIssues.some((i) => i.toLowerCase().includes("bob_sessions") || i.toLowerCase().includes("folder")),
    "bob_sessions issue should be in list"
  );
  assert(
    result.unresolvedIssues.some((i) => i.toLowerCase().includes("ibmid") || i.toLowerCase().includes("ibm")),
    "ibmid issue should be in list"
  );
  assert(
    result.unresolvedIssues.some((i) => i.toLowerCase().includes("bobcoin") || i.toLowerCase().includes("balance")),
    "bobcoins issue should be in list"
  );
});

// Test 16 — generateComplianceReport: no secrets in output
test("Test 16 — generateComplianceReport output does not contain secret patterns", () => {
  const report = generateComplianceReport(INITIAL_COMPLIANCE_STATE);
  const secretPatterns = ["ghp_", "sk-", "Bearer ", "PRIVATE", "password", "api_key", "apikey"];
  secretPatterns.forEach((pattern) => {
    assert(
      !report.toLowerCase().includes(pattern.toLowerCase()),
      `Report must not contain secret pattern: ${pattern}`
    );
  });
  assert(report.includes("IBM Bob"), "Report should reference IBM Bob");
  assert(report.includes("Hackathon"), "Report should reference Hackathon");
});

// Test 17 — bob_sessions folder exists but 0 PNGs → needs_attention
test("Test 17 — bob_sessions needs_attention when folder exists but contains no PNGs", () => {
  const state = makeState({ bobSessions: FOLDER_DETECTED_EMPTY });
  const result = evaluateComplianceRequirements(state);
  const item = result.items.find((i) => i.id === "bob_sessions");
  assertEqual(item!.status, "needs_attention", "bob_sessions status with empty folder");
  assert(
    result.unresolvedIssues.some((i) => i.includes("0") || i.toLowerCase().includes("png") || i.toLowerCase().includes("no")),
    "Unresolved issues should mention missing PNGs"
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n─────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed (${total} total)`);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed.\n`);
  process.exit(0);
}
