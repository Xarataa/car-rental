import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const { id } = await params;
  const booking = await db.booking.findUnique({ where: { id: Number(id) } });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "No booking." }, { status: 404 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ ok: true });
  }
  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
