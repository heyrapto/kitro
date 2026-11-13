import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL database...");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const migrationsFolder = resolve(__dirname, "../drizzle");
  console.log(`Running migrations from ${migrationsFolder}...`);

  await migrate(db, { migrationsFolder });
  console.log("✓ Database migrations applied successfully!");

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
