import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const ExtractedInvoice = z.object({
  invoiceId: z.string().describe("Invoice number or unique identifier (e.g. INV-1042)"),
  supplierName: z.string().describe("Legal or trading name of the supplier/vendor"),
  supplierXrplAddress: z
    .string()
    .optional()
    .describe("XRPL classic address (r-address) of the payee if explicitly stated"),
  amountDrops: z
    .string()
    .optional()
    .describe("Amount converted to integer drops of XRP (1 XRP = 1,000,000 drops)"),
  amountRaw: z.string().describe("Exact amount and currency as stated in the invoice"),
  currency: z.string().describe("ISO currency code or 'XRP'"),
  invoiceDate: z.string().optional().describe("Invoice date in YYYY-MM-DD format"),
  dueDate: z.string().optional().describe("Payment due date in YYYY-MM-DD format"),
  memo: z.string().optional().describe("Reference number, PO number, or memo to include with payment"),
  description: z.string().optional().describe("Summary of goods or services billed"),
  uncertain: z
    .array(z.string())
    .describe("List of field names where the model lacked certainty or had to infer"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall extraction confidence score between 0 and 1"),
});

export type ExtractedInvoice = z.infer<typeof ExtractedInvoice>;

/**
 * Deterministic fallback extractor for local testing or when ANTHROPIC_API_KEY is not configured.
 */
function extractWithRules(text: string): ExtractedInvoice {
  // 1. Invoice ID
  const invMatch =
    text.match(/(?:invoice|inv|bill)[\s#:]*([a-z0-9-_]+)/i) ??
    text.match(/#([a-z0-9-_]{4,})/i);
  const invoiceId = invMatch?.[1] ? invMatch[1].toUpperCase() : "INV-UNKNOWN";

  // 2. XRPL Address (starts with r, 25-35 base58 alphanumeric chars)
  const xrplMatch = text.match(/\b(r[1-9A-HJ-NP-Za-km-z]{24,34})\b/);
  const supplierXrplAddress = xrplMatch?.[1];

  // 3. Amount and currency
  const xrpAmountMatch =
    text.match(/(\d+(?:\.\d+)?)\s*(?:xrp|drops)/i) ??
    text.match(/(?:total|amount|due)[\s:$]*(\d+(?:\.\d+)?)/i);
  const rawNum = xrpAmountMatch?.[1] ?? "0";
  const isDrops = /drops/i.test(text);

  let amountDrops: string | undefined;
  if (isDrops) {
    amountDrops = Math.floor(Number(rawNum)).toString();
  } else {
    // 1 XRP = 1,000,000 drops
    const parsedXrp = parseFloat(rawNum);
    if (!isNaN(parsedXrp) && parsedXrp > 0) {
      amountDrops = Math.round(parsedXrp * 1_000_000).toString();
    }
  }

  // 4. Supplier Name
  const supplierMatch =
    text.match(/(?:from|vendor|supplier|company|biller)[\s:]*([^\n\r,]+)/i) ??
    text.match(/^([^\n\r]+)/);
  const supplierName = supplierMatch?.[1]?.trim() ?? "Unknown Vendor";

  // 5. Date
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const invoiceDate = dateMatch?.[1];

  const uncertain: string[] = [];
  if (!supplierXrplAddress) uncertain.push("supplierXrplAddress");
  if (!amountDrops) uncertain.push("amountDrops");
  if (invoiceId === "INV-UNKNOWN") uncertain.push("invoiceId");

  return {
    invoiceId,
    supplierName,
    supplierXrplAddress,
    amountDrops,
    amountRaw: `${rawNum} XRP`,
    currency: "XRP",
    invoiceDate,
    description: "Extracted invoice via rule engine",
    memo: invoiceId,
    uncertain,
    confidence: uncertain.length === 0 ? 0.95 : 0.65,
  };
}

/**
 * Extract structured invoice data from raw text or OCR.
 * Uses Anthropic via Vercel AI SDK when ANTHROPIC_API_KEY is available;
 * falls back to rule-based extraction otherwise.
 */
export async function extractInvoice(
  invoiceText: string,
  modelName = process.env.AGENT_MODEL ?? "claude-3-5-haiku-latest",
): Promise<ExtractedInvoice> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return extractWithRules(invoiceText);
  }

  try {
    const anthropic = createAnthropic({ apiKey });
    const { object } = await generateObject({
      model: anthropic(modelName),
      schema: ExtractedInvoice,
      prompt: `You are an expert treasury invoice extraction engine for Kitro on the XRP Ledger.
Extract payment details accurately from the invoice document below.
Critical constraints:
- Do NOT guess or hallucinate XRPL addresses. If none is present, leave supplierXrplAddress undefined.
- Convert XRP amounts to drops (1 XRP = 1,000,000 drops).
- Add any ambiguous or inferred fields to the 'uncertain' array.

Document:
${invoiceText}`,
    });

    return object;
  } catch (err: any) {
    console.warn(`[extractInvoice] Anthropic extraction failed: ${err.message}. Using rule fallback.`);
    return extractWithRules(invoiceText);
  }
}
