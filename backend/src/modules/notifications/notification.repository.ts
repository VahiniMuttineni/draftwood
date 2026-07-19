import { db } from "@/db";
import { notifications, notificationReads, type notifications as notificationsSchema } from "@/db/schema";
import { logger } from "@/lib/logger";

type NotificationInsert = typeof notificationsSchema.$inferInsert;

export class NotificationRepository {
  async create(data: NotificationInsert, tx: any = db) {
    logger.debug({ type: data.type }, "Creating notification");
    const [notification] = await tx.insert(notifications).values(data).returning();
    return notification;
  }
}

export const notificationRepository = new NotificationRepository();

