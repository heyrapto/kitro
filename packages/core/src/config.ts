import { z } from "zod";

export class KitroConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KitroConfigurationError";
  }
}

export const KitroConfigSchema = z.object({
  // Network
  XRPL_URL: z.string().url().default("wss://s.altnet.rippletest.net:51233"),
  NETWORK: z.string().default("xrpl:testnet"),

  // On-ledger addresses (safe to share)
  TREASURY_ADDRESS: z.string().min(20).optional(),
  OPERATOR_ADDRESS: z.string().min(20).optional(),
  AGENT_ADDRESS: z.string().min(20).optional(),
  POLICY_ADDRESS: z.string().min(20).optional(),
  SUPPLIER_ADDRESS: z.string().min(20).optional(),

  // Secrets (NEVER logged or shared)
  TREASURY_SEED: z.string().min(10).optional(),
  AGENT_SEED: z.string().min(10).optional(),
  POLICY_SEED: z.string().min(10).optional(),
  SUPPLIER_SEED: z.string().min(10).optional(),

  // Service Ports & URLs
  PORT: z.coerce.number().default(3000),
  POLICY_SERVICE_PORT: z.coerce.number().default(8787),
  MCP_PORT: z.coerce.number().default(3001),
  KITRO_API_URL: z.string().url().default("http://localhost:8787"),

  // Persistence & Security
  DATABASE_URL: z.string().optional(),
  KITRO_MCP_API_KEY: z.string().optional(),
  KITRO_ALLOWED_ORIGINS: z.string().optional(),
});

export type KitroConfig = z.infer<typeof KitroConfigSchema>;

/**
 * Resolves environment variables applying canonical names and legacy alias fallbacks.
 * Detects conflicts when both canonical and alias names are set with differing values.
 */
export function resolveRawEnv(env: Record<string, string | undefined> = process.env): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = { ...env };

  // 1. XRPL URL: Canonical is XRPL_URL, aliases: XRPL_RPC_URL, NEXT_PUBLIC_XRPL_WS
  const xrplUrl = env.XRPL_URL || env.XRPL_RPC_URL || env.NEXT_PUBLIC_XRPL_WS || "wss://s.altnet.rippletest.net:51233";
  if (env.XRPL_URL && env.XRPL_RPC_URL && env.XRPL_URL !== env.XRPL_RPC_URL) {
    throw new KitroConfigurationError(
      "Conflicting configuration: XRPL_URL and XRPL_RPC_URL are both set but have differing values.",
    );
  }
  result.XRPL_URL = xrplUrl;

  // 2. AGENT SEED: Canonical is AGENT_SEED, alias: AGENT_SIGNER_SEED
  if (env.AGENT_SEED && env.AGENT_SIGNER_SEED && env.AGENT_SEED !== env.AGENT_SIGNER_SEED) {
    throw new KitroConfigurationError(
      "Conflicting configuration: AGENT_SEED and AGENT_SIGNER_SEED are both set but have differing values.",
    );
  }
  result.AGENT_SEED = env.AGENT_SEED || env.AGENT_SIGNER_SEED;

  // 3. POLICY SEED: Canonical is POLICY_SEED, alias: POLICY_SIGNER_SEED
  if (env.POLICY_SEED && env.POLICY_SIGNER_SEED && env.POLICY_SEED !== env.POLICY_SIGNER_SEED) {
    throw new KitroConfigurationError(
      "Conflicting configuration: POLICY_SEED and POLICY_SIGNER_SEED are both set but have differing values.",
    );
  }
  result.POLICY_SEED = env.POLICY_SEED || env.POLICY_SIGNER_SEED;

  // 4. TREASURY ADDRESS: Canonical is TREASURY_ADDRESS, alias: OPERATOR_ADDRESS
  if (env.TREASURY_ADDRESS && env.OPERATOR_ADDRESS && env.TREASURY_ADDRESS !== env.OPERATOR_ADDRESS) {
    throw new KitroConfigurationError(
      "Conflicting configuration: TREASURY_ADDRESS and OPERATOR_ADDRESS are both set but have differing values.",
    );
  }
  result.TREASURY_ADDRESS = env.TREASURY_ADDRESS || env.OPERATOR_ADDRESS;
  result.OPERATOR_ADDRESS = result.TREASURY_ADDRESS;

  // 5. AGENT ADDRESS: Canonical is AGENT_ADDRESS, alias: AGENT_SIGNER_ADDRESS
  result.AGENT_ADDRESS = env.AGENT_ADDRESS || env.AGENT_SIGNER_ADDRESS;

  // 6. POLICY ADDRESS: Canonical is POLICY_ADDRESS, alias: POLICY_SIGNER_ADDRESS
  result.POLICY_ADDRESS = env.POLICY_ADDRESS || env.POLICY_SIGNER_ADDRESS;

  return result;
}

/**
 * Returns validated Kitro configuration.
 * @param requiredKeys Optional list of required keys (e.g. ['AGENT_SEED', 'POLICY_SEED'])
 */
export function getKitroConfig(
  requiredKeys: Array<keyof KitroConfig> = [],
  env: Record<string, string | undefined> = process.env,
): KitroConfig {
  const resolved = resolveRawEnv(env);

  // Validate required keys first
  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (!resolved[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new KitroConfigurationError(
      `Missing required environment variable(s): ${missing.join(", ")}. Please configure them in .env.local or refer to docs/ENVIRONMENT_SETUP.md.`,
    );
  }

  const parsed = KitroConfigSchema.safeParse(resolved);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new KitroConfigurationError(`Configuration validation failed: ${issues}`);
  }

  return parsed.data;
}
