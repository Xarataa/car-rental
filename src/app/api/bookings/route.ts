import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysBetween, hasOverlap, prepayAmount, rentBlockReason } from "@/lib/booking";

export const runtime = "nodejs";

function dayOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const carPublic = {
  id: true,
  name: true,
  brand: true,
  carType: true,
  city: true,
  pricePerDay: true,
  seats: true,
  imageUrl: true,
  description: true,
  available: true,
  prepayPercent: true,
} as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const carId = Number(url.searchParams.get("carId") ?? "");
  if (carId) {
    const list = await db.booking.findMany({
      where: { carId, status: "CONFIRMED" },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json({ busy: list });
  }

  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const list = await db.booking.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalPrice: true,
      status: true,
      contractSigned: true,
      paymentStatus: true,
      prepayPercent: true,
      prepayAmount: true,
      createdAt: true,
      car: { select: carPublic },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ bookings: list });
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const blocked = await rentBlockReason(user.id);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const carId = Number(body?.carId);
  const startRaw = String(body?.startDate ?? "");
  const endRaw = String(body?.endDate ?? "");
  if (!carId || !startRaw || !endRaw) {
    return NextResponse.json({ error: "Car and dates are needed." }, { status: 400 });
  }

  const start = dayOnly(new Date(startRaw));
  const end = dayOnly(new Date(endRaw));
  const today = dayOnly(new Date());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Bad dates." }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "End day must be after start day." }, { status: 400 });
  }
  if (start < today) {
    return NextResponse.json({ error: "Start day cannot be in the past." }, { status: 400 });
  }

  const car = await db.car.findUnique({ where: { id: carId } });
  if (!car) {
    return NextResponse.json({ error: "No car." }, { status: 404 });
  }
  if (!car.available) {
    return NextResponse.json({ error: "This car is busy now." }, { status: 400 });
  }

  if (await hasOverlap(carId, start, end)) {
    return NextResponse.json({ error: "These days are already booked. Pick other days." }, { status: 400 });
  }

  const days = daysBetween(start, end);
  const totalPrice = Math.round(days * car.pricePerDay * 100) / 100;
  const percent = car.prepayPercent || 10;
  const prepay = prepayAmount(totalPrice, percent);

  const booking = await db.booking.create({
    data: {
      userId: user.id,
      carId,
      startDate: start,
      endDate: end,
      totalPrice,
      prepayPercent: percent,
      prepayAmount: prepay,
    },
  });
  return NextResponse.json({ booking });
}
