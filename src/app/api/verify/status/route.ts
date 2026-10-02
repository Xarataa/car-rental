import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ status: "NONE", loggedIn: false });
  const v = await db.verification.findUnique({ where: { userId: user.id } });
  if (!v) return NextResponse.json({ status: "NONE", loggedIn: true });
  return NextResponse.json({
    status: v.status,
    faceMatch: v.faceMatch,
    faceScore: v.faceScore,
    reason: v.reason,
    idFrontUrl: v.idFrontUrl,
    selfieUrl: v.selfieUrl,
    loggedIn: true,
  });
}
