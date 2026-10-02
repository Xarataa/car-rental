import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const list = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      car: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ list });
}
