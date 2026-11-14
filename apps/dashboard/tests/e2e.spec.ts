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

  test("2. Complete onboarding flow guides through 7 setup steps", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 1: Identity
    await expect(page.getByRole("heading", { name: "Configure Treasury Workspace" })).toBeVisible();
    await expect(page.getByText(/Step 1 of 7/i)).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Acme Corp Treasury")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Network
    await expect(page.getByRole("heading", { name: "Select Settlement Network" })).toBeVisible();
    await expect(page.getByText("XRPL Testnet (Active)")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Connect Operator Wallet
    await expect(page.getByRole("heading", { name: "Connect Operator Wallet" })).toBeVisible();
    await expect(page.getByText("Pre-Funded Testnet Treasury")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Treasury Account Details
    await expect(page.getByRole("heading", { name: "On-Ledger Treasury Account" })).toBeVisible();
    await expect(page.getByText("Live Testnet Balance")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: 2-of-2 Multi-Signing
    await expect(page.getByRole("heading", { name: "2-of-2 Multisig Architecture" })).toBeVisible();
    await expect(page.getByText("Signer 1: AI Execution Agent")).toBeVisible();
    await expect(page.getByText("Signer 2: Policy Referee")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: Policy Mandate
    await expect(page.getByRole("heading", { name: "Configure Spending Mandate" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 7: Launch Readiness
    await expect(page.getByRole("heading", { name: "Treasury Ready for Operations" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open My Treasury" })).toBeVisible();
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

    // Multisig and security governance status
    await expect(page.getByText("2-of-2 Quorum")).toBeVisible();
    await expect(page.getByText("Security Governance Model:")).toBeVisible();
    await expect(page.getByText("First-Run Demo & Testnet Verification Checklist")).toBeVisible();
  });

  test("4. Invoice extraction and policy evaluation", async ({ page }) => {
    await page.goto("/dashboard/invoices");

    await expect(page.getByRole("heading", { name: "Invoice Intelligence" })).toBeVisible();

    // Verify sample invoice
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toContainText("INVOICE #INV-2026-CLOUD-01");

    // Click AI / Rule extraction button
    const extractBtn = page.getByRole("button", { name: /Run AI Invoice Extraction/i });
    await extractBtn.click();

    // Verify structured proposal and evaluation trigger
    await expect(page.getByRole("heading", { name: "Structured Proposal" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Evaluate with Policy Referee/i })).toBeVisible();
  });

  test("5. Approval queue displays held payments requiring human operator authorization", async ({ page }) => {
    await page.goto("/dashboard/approvals");

    await expect(page.getByRole("heading", { name: "Approval Queue" })).toBeVisible();
    await expect(page.getByText(/Operator authorization required/i)).toBeVisible();
  });

  test("6. Payment registry and payment details drawer", async ({ page }) => {
    await page.goto("/dashboard/payments");

    await expect(page.getByRole("heading", { name: "Payment Requests" })).toBeVisible();
    await expect(page.getByText("INV-2026-CLOUD-01")).toBeVisible();

    // Click on payment row to inspect forensic details modal
    await page.getByText("INV-2026-CLOUD-01").click();
    await expect(page.getByText("Payment Proposal Forensic Audit")).toBeVisible();
    await expect(page.getByText("Payee Destination")).toBeVisible();
  });

  test("7. Policy configuration displays spending limits and mandate version", async ({ page }) => {
    await page.goto("/dashboard/policy");

    await expect(page.getByRole("heading", { name: "Treasury Policies & Mandates" })).toBeVisible();
    await expect(page.getByText("Per-Payment Maximum (XRP)")).toBeVisible();
    await expect(page.getByText("Daily Spending Limit (XRP)")).toBeVisible();
    await expect(page.getByText("Require Approval Above (XRP)")).toBeVisible();
  });

  test("8. Supplier allowlist displays verified payees and explorer links", async ({ page }) => {
    await page.goto("/dashboard/suppliers");

    await expect(page.getByRole("heading", { name: "Authorized Suppliers" })).toBeVisible();
    await expect(page.getByText("Reliable Cloud Services Ltd")).toBeVisible();
    await expect(page.getByText("Approved").first()).toBeVisible();
    await expect(page.getByText("Inspect").first()).toBeVisible();
  });

  test("9. Audit receipts display cryptographic SHA-256 hashes and ledger verification", async ({ page }) => {
    await page.goto("/dashboard/audit");

    await expect(page.getByRole("heading", { name: "Audit Trail & Signed Receipts" })).toBeVisible();
    await expect(page.getByText("Receipt Hash (SHA-256)")).toBeVisible();
    await expect(page.getByText("Verified ✓").first()).toBeVisible();
  });

  test("10. Settings and MCP integration instructions display complete tool catalog", async ({ page }) => {
    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: "Settings & MCP Integration" })).toBeVisible();
    await expect(page.getByText("wss://s.altnet.rippletest.net:51233")).toBeVisible();
    await expect(page.getByText(/2 of 2/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Google Antigravity MCP Configuration/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Claude Desktop MCP Configuration/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Registered MCP Tools/i })).toBeVisible();
  });
});
