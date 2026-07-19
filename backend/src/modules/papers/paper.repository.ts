import { db } from "@/db";
import { papers, type papers as papersSchema } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { OptimisticConcurrencyError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type PaperInsert = typeof papersSchema.$inferInsert;
type PaperUpdate = Partial<PaperInsert>;

export class PaperRepository {
  async findById(id: string, tx: any = db) {
    const doc = await tx.query.papers.findFirst({
      where: eq(papers.id, id),
    });
    return doc;
  }

  async create(data: PaperInsert, tx: any = db) {
    const [doc] = await tx.insert(papers).values(data).returning();
    return doc;
  }

  // Update a paper with Optimistic Concurrency Control (OCC)
  async updateWithOcc(id: string, currentVersion: number, data: PaperUpdate, tx: any = db) {
    logger.debug({ paperId: id, currentVersion }, "Executing optimistic update");
    
    const [updated] = await tx
      .update(papers)
      .set({
        ...data,
        optimisticVersion: currentVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(papers.id, id),
          eq(papers.optimisticVersion, currentVersion)
        )
      )
      .returning();

    if (!updated) {
      const exists = await this.findById(id, tx);
      if (!exists) {
        throw new NotFoundError(`Paper ${id} not found`);
      }
      logger.warn({ paperId: id, expectedVersion: currentVersion, actualVersion: exists.optimisticVersion }, "Optimistic concurrency conflict");
      throw new OptimisticConcurrencyError();
    }

    return updated;
  }
}

export const paperRepository = new PaperRepository();
