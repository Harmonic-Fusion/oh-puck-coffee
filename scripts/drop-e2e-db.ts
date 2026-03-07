import { config } from "dotenv";
import { dropTestDb } from "../e2e/helpers/test-db";

async function main() {
  config({ path: ".env.test" });
  if (!process.env.DATABASE_URL) throw new Error("No url");
  await dropTestDb(process.env.DATABASE_URL);
  console.log("Dropped DB");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
