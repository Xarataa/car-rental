import { db } from "./db";

export function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// User can rent only if Gmail is checked AND licence is VERIFIED.
export async function rentBlockReason(userId: number): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return "Please log in first.";
  if (!user.emailVerified) return "Please check your Gmail first.";
  const v = await db.verification.findUnique({ where: { userId } });
  if (!v || v.status !== "VERIFIED") {
    return "Please verify your licence first.";
  }
  return null;
}

export function prepayAmount(total: number, percent: number) {
  const p = Math.min(100, Math.max(1, Math.round(percent)));
  return Math.round(total * (p / 100) * 100) / 100;
}

export async function hasOverlap(carId: number, start: Date, end: Date, ignoreId?: number) {
  const clash = await db.booking.findFirst({
    where: {
      carId,
      status: "CONFIRMED",
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  return !!clash;
}
