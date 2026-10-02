import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ emailVerified: false, loggedIn: false });
  const full = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, email: true },
  });
  return NextResponse.json({
    loggedIn: true,
    email: full?.email,
    emailVerified: full?.emailVerified ?? false,
  });
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Code is needed." }, { status: 400 });
  }
  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full || !full.emailCode || !full.emailCodeExpiry) {
    return NextResponse.json({ error: "No code. Ask for a new one." }, { status: 400 });
  }
  if (full.emailCodeExpiry < new Date()) {
    return NextResponse.json({ error: "Code is old. Ask for a new one." }, { status: 400 });
  }
  if (full.emailCode !== code) {
    return NextResponse.json({ error: "Wrong code. Try again." }, { status: 400 });
  }
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailCode: null, emailCodeExpiry: null },
  });
  return NextResponse.json({ ok: true });
}
