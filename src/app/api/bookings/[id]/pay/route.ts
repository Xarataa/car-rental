import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Demo pay now, real card provider later (Stripe etc.).
// Pays only the prepay part. Rest goes to the owner in person.
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
    return NextResponse.json({ error: "Booking is cancelled." }, { status: 400 });
  }
  if (!booking.contractSigned) {
    return NextResponse.json({ error: "Sign the contract first." }, { status: 400 });
  }
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, already: true });
  }

  // TODO later: real charge with card provider here, then mark PAID.
  await db.booking.update({
    where: { id: booking.id },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });
  return NextResponse.json({ ok: true, demo: true, amount: booking.prepayAmount });
}
