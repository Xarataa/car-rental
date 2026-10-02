import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Booking is cancelled." }, { status: 400 });
  }
  if (booking.contractSigned) {
    return NextResponse.json({ ok: true, already: true });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const agree = body?.agree === true;
  if (!agree) {
    return NextResponse.json({ error: "Please tick the agree box." }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Type your full name as signature." }, { status: 400 });
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { contractSigned: true, contractName: name, contractSignedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
