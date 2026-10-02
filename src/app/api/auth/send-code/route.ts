import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { makeEmailCode, sendEmailCode } from "@/lib/email";

export async function POST() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full) {
    return NextResponse.json({ error: "No user." }, { status: 404 });
  }
  if (full.emailVerified) {
    return NextResponse.json({ ok: true, already: true });
  }
  const emailCode = makeEmailCode();
  const emailCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await db.user.update({
    where: { id: user.id },
    data: { emailCode, emailCodeExpiry },
  });
  const sent = await sendEmailCode(full.email, emailCode);
  return NextResponse.json({
    ok: true,
    emailSent: sent.real,
    ...("demoCode" in sent ? { demoCode: sent.demoCode } : {}),
  });
}
