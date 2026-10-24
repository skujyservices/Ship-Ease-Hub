import "server-only";
import { db } from "./db";
import { deletePhotos } from "./storage";
import { STATUS } from "./status";

const DAY = 86_400_000;

/** Daily clean-up matching the privacy policy's retention periods. */
export async function housekeeping(now = new Date()) {
  const rateLimits = await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - DAY) } } });
  const errors = await db.errorLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * DAY) } } });

  // Package photos: 12 months after the package was collected, delivered or disposed of
  const yearAgo = new Date(now.getTime() - 365 * DAY);
  const old = await db.package.findMany({
    where: {
      photos: { isEmpty: false },
      shipment: { status: { in: [STATUS.COLLECTED, STATUS.DISPOSED] }, updatedAt: { lt: yearAgo } },
    },
    take: 200,
  });
  for (const p of old) {
    await deletePhotos(p.photos);
    await db.package.update({ where: { id: p.id }, data: { photos: [] } });
  }
  return { rateLimitsCleared: rateLimits.count, errorLogsCleared: errors.count, photoSetsDeleted: old.length };
}

/** Server errors from the last week, newest first (Admin → Overview). */
export const recentErrors = (days = 7) =>
  db.errorLog.findMany({ where: { createdAt: { gte: new Date(Date.now() - days * DAY) } }, orderBy: { createdAt: "desc" }, take: 10 });
