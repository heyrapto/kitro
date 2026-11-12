import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("schema", () => {
  it("defines the documented tables", () => {
    const tableNames = Object.values(schema)
      .map((table) => getTableName(table))
      .sort();

    expect(tableNames).toEqual([
      "approvals",
      "channels",
      "claims",
      "decisions",
      "escrows",
      "mandates",
      "requests",
      "spend",
      "txs",
    ]);
  });
});
