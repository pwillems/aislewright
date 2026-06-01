import fs from "node:fs/promises";
import path from "node:path";
import { pool, closeDb } from "./db.js";

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "../../packages/db/migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    console.log("Running migration " + file);
    await pool.query(sql);
  }
}

main()
  .then(async () => {
    await closeDb();
  })
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
