import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Booking detail. Exact pickup place + owner phone ONLY after prepay is PAID.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const { id } = await params;
  const b = await db.booking.findUnique({
    where: { id: Number(id) },
    include: { car: true },
  });
  if (!b || b.userId !== user.id) {
    return NextResponse.json({ error: "No booking." }, { status: 404 });
  }

  const paid = b.paymentStatus === "PAID";
  return NextResponse.json({
    booking: {
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
      totalPrice: b.totalPrice,
      status: b.status,
      contractSigned: b.contractSigned,
      contractName: b.contractName,
      contractSignedAt: b.contractSignedAt,
      paymentStatus: b.paymentStatus,
      prepayPercent: b.prepayPercent,
      prepayAmount: b.prepayAmount,
      restAmount: Math.round((b.totalPrice - b.prepayAmount) * 100) / 100,
      paidAt: b.paidAt,
      createdAt: b.createdAt,
    },
    car: {
      id: b.car.id,
      name: b.car.name,
      brand: b.car.brand,
      carType: b.car.carType,
      city: b.car.city,
      pricePerDay: b.car.pricePerDay,
      seats: b.car.seats,
      imageUrl: b.car.imageUrl,
    },
    // Secret part: only after payment.
    pickup: paid
      ? { location: b.car.pickupLocation, ownerPhone: b.car.ownerPhone }
      : null,
  });
}
