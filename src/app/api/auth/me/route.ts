import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ user: null });
  const full = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
  });
  return NextResponse.json({ user: full });
}
