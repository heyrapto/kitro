import { describe, it, expect } from "vitest";
import { getKitroConfig, resolveRawEnv, KitroConfigurationError } from "./config.js";

describe("Kitro Canonical Configuration Module", () => {
  it("resolves default values correctly when env is minimal", () => {
    const config = getKitroConfig([], {});
    expect(config.XRPL_URL).toBe("wss://s.altnet.rippletest.net:51233");
    expect(config.PORT).toBe(3000);
    expect(config.POLICY_SERVICE_PORT).toBe(8787);
    expect(config.MCP_PORT).toBe(3001);
  });

  it("handles alias fallbacks seamlessly", () => {
    const resolved = resolveRawEnv({
      XRPL_RPC_URL: "wss://custom.xrpl.test:51233",
      AGENT_SIGNER_SEED: "sEdSampleAgentSeed123",
      POLICY_SIGNER_SEED: "sEdSamplePolicySeed456",
      OPERATOR_ADDRESS: "rSampleOperatorAddr",
    });

    expect(resolved.XRPL_URL).toBe("wss://custom.xrpl.test:51233");
    expect(resolved.AGENT_SEED).toBe("sEdSampleAgentSeed123");
    expect(resolved.POLICY_SEED).toBe("sEdSamplePolicySeed456");
    expect(resolved.TREASURY_ADDRESS).toBe("rSampleOperatorAddr");
  });

  it("throws clear conflict error when canonical and alias contradict each other", () => {
    expect(() =>
      resolveRawEnv({
        AGENT_SEED: "sEdSeedA1111111111111",
        AGENT_SIGNER_SEED: "sEdSeedB2222222222222",
      }),
    ).toThrow(KitroConfigurationError);
  });

  it("throws descriptive error when required variables are missing without printing secrets", () => {
    expect(() =>
      getKitroConfig(["AGENT_SEED", "POLICY_SEED"], {
        XRPL_URL: "wss://s.altnet.rippletest.net:51233",
      }),
    ).toThrow(/Missing required environment variable\(s\): AGENT_SEED, POLICY_SEED/);
  });
});
