import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COOKIE_NAME, checkPassword, makeSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are needed." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 400 });
  }

  const ok = await checkPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 400 });
  }

  const token = await makeSession(user.id);
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}
