import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Simple demo admin: any logged-in user can see the list for now.
// Later add real admin role.
export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const list = await db.verification.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ list });
}
