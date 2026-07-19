import { config } from "dotenv";
config();
import { db } from "./index";
import { documents } from "./schema";
async function run() {
  const docs = await db.query.documents.findMany({ limit: 1 });
  console.log(JSON.stringify(docs[0].body, null, 2));
  process.exit(0);
}
run();
