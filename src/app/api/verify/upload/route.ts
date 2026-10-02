import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideVerification } from "@/lib/verification";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

function extOf(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Bad upload." }, { status: 400 });
  }

  const idFront = form.get("idFront");
  const selfie = form.get("selfie");
  const faceScoreRaw = form.get("faceScore");
  const idFacesRaw = form.get("idFaces");
  const selfieFacesRaw = form.get("selfieFaces");

  if (!(idFront instanceof File) || !(selfie instanceof File)) {
    return NextResponse.json(
      { error: "Need ID photo and selfie photo." },
      { status: 400 }
    );
  }

  if (!ALLOWED.has(idFront.type) || !ALLOWED.has(selfie.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG or WEBP photos allowed." },
      { status: 400 }
    );
  }

  if (idFront.size > MAX_SIZE || selfie.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Photo is too big. Max 5 MB each." },
      { status: 400 }
    );
  }
  if (idFront.size < 1024 || selfie.size < 1024) {
    return NextResponse.json({ error: "Photo file is broken." }, { status: 400 });
  }

  const faceScore =
    faceScoreRaw === null || faceScoreRaw === ""
      ? null
      : Number(faceScoreRaw);
  const idFaces = Number(idFacesRaw ?? 0);
  const selfieFaces = Number(selfieFacesRaw ?? 0);

  const decided = decideVerification({
    faceScore: faceScore !== null && !Number.isNaN(faceScore) ? faceScore : null,
    idFaces: Number.isNaN(idFaces) ? 0 : idFaces,
    selfieFaces: Number.isNaN(selfieFaces) ? 0 : selfieFaces,
    idSize: idFront.size,
    selfieSize: selfie.size,
  });

  // Save files to public/uploads so admin can see them
  const dir = path.join(process.cwd(), "public", "uploads", "verify");
  await fs.mkdir(dir, { recursive: true });
  const stamp = Date.now();
  const idName = `${user.id}-id-${stamp}.${extOf(idFront.type)}`;
  const selfieName = `${user.id}-selfie-${stamp}.${extOf(selfie.type)}`;
  await fs.writeFile(
    path.join(dir, idName),
    Buffer.from(await idFront.arrayBuffer())
  );
  await fs.writeFile(
    path.join(dir, selfieName),
    Buffer.from(await selfie.arrayBuffer())
  );

  const idFrontUrl = `/uploads/verify/${idName}`;
  const selfieUrl = `/uploads/verify/${selfieName}`;

  const saved = await db.verification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: decided.status,
      idFrontUrl,
      selfieUrl,
      faceScore: faceScore ?? null,
      faceMatch: decided.faceMatch,
      reason: decided.reason ?? null,
      provider: "local",
    },
    update: {
      status: decided.status,
      idFrontUrl,
      selfieUrl,
      faceScore: faceScore ?? null,
      faceMatch: decided.faceMatch,
      reason: decided.reason ?? null,
      provider: "local",
    },
  });

  return NextResponse.json({
    status: saved.status,
    faceMatch: saved.faceMatch,
    faceScore,
    reason: saved.reason,
  });
}
