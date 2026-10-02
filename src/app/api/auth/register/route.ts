import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COOKIE_NAME, hashPassword, makeSession } from "@/lib/auth";
import { makeEmailCode, sendEmailCode } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are needed." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be 6 or more letters." }, { status: 400 });
  }

  const old = await db.user.findUnique({ where: { email } });
  if (old) {
    return NextResponse.json({ error: "This email is already used." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const emailCode = makeEmailCode();
  const emailCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
  const user = await db.user.create({
    data: { name, email, passwordHash, emailCode, emailCodeExpiry },
  });
  const sent = await sendEmailCode(email, emailCode);
  const token = await makeSession(user.id);

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    emailSent: sent.real,
    // Demo only: show code on screen until real Gmail is set.
    ...("demoCode" in sent ? { demoCode: sent.demoCode } : {}),
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}
