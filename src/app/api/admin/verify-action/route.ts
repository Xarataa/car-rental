import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const admin = await getUserFromSession();
  if (!admin) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const userId = Number(body?.userId);
  const action = String(body?.action ?? "");
  const reason = String(body?.reason ?? "");

  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Bad action." }, { status: 400 });
  }

  const status = action === "approve" ? "VERIFIED" : "REJECTED";
  const updated = await db.verification.update({
    where: { userId },
    data: {
      status,
      reason: action === "approve" ? null : reason || "Rejected by admin.",
      provider: "local+admin",
    },
  });

  return NextResponse.json({ status: updated.status });
}
