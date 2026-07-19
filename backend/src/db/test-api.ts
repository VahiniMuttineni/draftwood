import { config } from "dotenv";
config();
import { db } from "./index";
import { documents } from "./schema";
import { eq } from "drizzle-orm";

async function run() {
  const doc = await db.query.documents.findFirst();
  if (!doc) return;
  
  const testBody = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "Bold Text" },
          { type: "text", text: " Normal Text " },
          { type: "text", marks: [{ type: "italic" }], text: "Italic Text" }
        ]
      }
    ]
  };

  await db.update(documents).set({ body: testBody }).where(eq(documents.id, doc.id));
  const fetched = await db.query.documents.findFirst({ where: eq(documents.id, doc.id) });
  console.log("Fetched body:", JSON.stringify(fetched.body, null, 2));
  process.exit(0);
}
run();
