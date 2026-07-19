import { createAuthClient } from "better-auth/react";
// We need to bypass auth or use the DB directly to simulate the update and fetch.
// Actually, let's just do it directly via DB to bypass auth.
import { db } from "./backend/src/db/index";
import { documents } from "./backend/src/db/schema";
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

  // Update
  await db.update(documents).set({ body: testBody }).where(eq(documents.id, doc.id));
  
  // Fetch
  const fetched = await db.query.documents.findFirst({ where: eq(documents.id, doc.id) });
  console.log("Fetched body:", JSON.stringify(fetched.body, null, 2));
  process.exit(0);
}
run();
