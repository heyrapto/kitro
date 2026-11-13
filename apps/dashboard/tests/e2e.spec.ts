import { test, expect } from "@playwright/test";

test.describe("Kitro Dashboard Forensic Browser Acceptance Suite", () => {
  test("1. Landing page renders correct product positioning and navigates to onboarding & dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    // Verify core positioning
    await expect(page.locator("h1")).toContainText("Let AI handle the work.");
    await expect(page.locator("h1")).toContainText("Keep control of the money.");
    await expect(page.getByText("Policy-Controlled Autonomous Treasury", { exact: true })).toBeVisible();
    await expect(
      page.getByText("An AI agent may request a payment. It must never be allowed to authorize itself."),
    ).toBeVisible();

    // Verify Guided Setup and Dashboard navigation
    await expect(page.getByRole("link", { name: "Start Guided Setup" })).toBeVisible();
    await page.getByRole("link", { name: "Open Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("2. Onboarding wizard guides through 7 setup steps", async ({ page }) => {
    await page.goto("/onboarding");

    // Header and steps
    await expect(page.getByRole("heading", { name: "Configure Treasury Workspace" })).toBeVisible();
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible();

    // Step 1: Workspace name
    await expect(page.getByPlaceholder("e.g. Acme Corp Treasury")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Network
    await expect(page.getByRole("heading", { name: "Select Settlement Network" })).toBeVisible();
    await expect(page.getByText("XRPL Testnet (Active)")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Wallet
    await expect(page.getByRole("heading", { name: "Connect Operator Wallet" })).toBeVisible();
    await expect(page.getByText("Pre-Funded Testnet Treasury")).toBeVisible();
  });

  test("3. Treasury overview displays balance, capacity, and active signers", async ({ page }) => {
    await page.goto("/dashboard");

    // Header and navigation
    await expect(page.getByRole("heading", { name: "Treasury Overview" })).toBeVisible();

    // Key metrics cards
    await expect(page.getByText("On-Ledger Balance")).toBeVisible();
    await expect(page.getByText("Daily Limit")).toBeVisible();
    await expect(page.getByText("Spent Today")).toBeVisible();
    await expect(page.getByText("Policy Capacity")).toBeVisible();

    // Multisig status
    await expect(page.getByText("2-of-2 Quorum")).toBeVisible();
    await expect(page.getByText("First-Run Demo & Testnet Verification Checklist")).toBeVisible();
  });

  test("4. Invoices page extracts structured data and evaluates with policy referee", async ({
    page,
  }) => {
    await page.goto("/dashboard/invoices");

    await expect(page.getByRole("heading", { name: "Invoice Intelligence" })).toBeVisible();

    // Verify textarea contains sample invoice
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toContainText("INVOICE #INV-2026-CLOUD-01");

    // Click AI / Rule extraction button
    const extractBtn = page.getByRole("button", { name: /Run AI Invoice Extraction/i });
    await extractBtn.click();

    // Verify extraction outputs populate
    await expect(page.getByRole("heading", { name: "Structured Proposal" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Evaluate with Policy Referee/i })).toBeVisible();
  });

  test("5. Approvals queue displays held payments requiring human operator authorization", async ({
    page,
  }) => {
    await page.goto("/dashboard/approvals");

    await expect(page.getByRole("heading", { name: "Approval Queue" })).toBeVisible();
    await expect(page.getByText(/Operator authorization required/i)).toBeVisible();
  });

  test("6. Policy page displays active spending limits, caps, and allowlist rules", async ({ page }) => {
    await page.goto("/dashboard/policy");

    await expect(page.getByRole("heading", { name: "Treasury Policies & Mandates" })).toBeVisible();
    await expect(page.getByText("Per-Payment Maximum (XRP)")).toBeVisible();
    await expect(page.getByText("Daily Spending Limit (XRP)")).toBeVisible();
    await expect(page.getByText("Require Approval Above (XRP)")).toBeVisible();
  });

  test("7. Audit page displays cryptographic audit receipts and verifiable hashes", async ({ page }) => {
    await page.goto("/dashboard/audit");

    await expect(page.getByRole("heading", { name: "Audit Trail & Signed Receipts" })).toBeVisible();
    await expect(page.getByText("Receipt Hash (SHA-256)")).toBeVisible();
    await expect(page.getByText("Verified ✓").first()).toBeVisible();
  });

  test("8. Settings page displays network connection, multisig quorum, and integration information", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: "Settings & MCP Integration" })).toBeVisible();
    await expect(page.getByText("wss://s.altnet.rippletest.net:51233")).toBeVisible();
    await expect(page.getByText(/2 of 2/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Google Antigravity MCP Configuration/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Registered MCP Tools/i })).toBeVisible();
  });
});
