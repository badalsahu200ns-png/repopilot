import type { Metadata } from "next";
import ComplianceClient from "./ComplianceClient";

export const metadata: Metadata = {
  title: "Hackathon Readiness — IBM Bob 2.0",
  description: "Verify your RepoPilot submission against the IBM Bob 2.0 Hackathon requirements.",
};

export default function CompliancePage() {
  return <ComplianceClient />;
}
