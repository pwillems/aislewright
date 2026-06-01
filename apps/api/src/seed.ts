import fs from "node:fs/promises";
import path from "node:path";
import { pool, closeDb } from "./db.js";

async function main() {
  const seedPath = path.resolve(process.cwd(), "../../packages/db/seeds/demo.sql");
  const sql = await fs.readFile(seedPath, "utf8");
  console.log("Running demo seed");
  await pool.query(sql);
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
