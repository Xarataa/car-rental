import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_IMG = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await db.car.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      brand: true,
      carType: true,
      city: true,
      pricePerDay: true,
      seats: true,
      imageUrl: true,
      description: true,
      available: true,
      prepayPercent: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!car) return NextResponse.json({ error: "No car." }, { status: 404 });
  return NextResponse.json({ car });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const { id } = await params;
  const carId = Number(id);
  const old = await db.car.findUnique({ where: { id: carId } });
  if (!old) return NextResponse.json({ error: "No car." }, { status: 404 });

  const ctype = req.headers.get("content-type") ?? "";
  let data: Record<string, string> = {};
  let imageUrl = old.imageUrl;

  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const k of ["name", "brand", "carType", "city", "pricePerDay", "seats", "description", "available", "imageUrl", "pickupLocation", "ownerPhone", "prepayPercent"]) {
      const v = form.get(k);
      if (typeof v === "string") data[k] = v;
    }
    const img = form.get("image");
    if (img instanceof File && img.size > 0) {
      if (!ALLOWED.has(img.type)) {
        return NextResponse.json({ error: "Image must be JPG, PNG or WEBP." }, { status: 400 });
      }
      if (img.size > MAX_IMG) {
        return NextResponse.json({ error: "Image max 5 MB." }, { status: 400 });
      }
      const dir = path.join(process.cwd(), "public", "uploads", "cars");
      await fs.mkdir(dir, { recursive: true });
      const ext = img.type === "image/png" ? "png" : img.type === "image/webp" ? "webp" : "jpg";
      const fname = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
      await fs.writeFile(path.join(dir, fname), Buffer.from(await img.arrayBuffer()));
      imageUrl = `/uploads/cars/${fname}`;
    } else if (data.imageUrl !== undefined) {
      imageUrl = data.imageUrl;
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad data." }, { status: 400 });
    for (const k of ["name", "brand", "carType", "city", "pricePerDay", "seats", "description", "available", "imageUrl", "pickupLocation", "ownerPhone", "prepayPercent"]) {
      if (body[k] !== undefined) data[k] = String(body[k]);
    }
    if (data.imageUrl !== undefined) imageUrl = data.imageUrl;
  }

  let prepayPercent: number | undefined;
  if (data.prepayPercent !== undefined) {
    const p = Math.round(Number(data.prepayPercent));
    if (!Number.isNaN(p)) prepayPercent = Math.min(100, Math.max(1, p));
  }

  const car = await db.car.update({
    where: { id: carId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.brand !== undefined ? { brand: data.brand.trim() } : {}),
      ...(data.carType !== undefined ? { carType: data.carType.trim() } : {}),
      ...(data.city ? { city: data.city.trim() } : {}),
      ...(data.pricePerDay ? { pricePerDay: Number(data.pricePerDay) || old.pricePerDay } : {}),
      ...(data.seats ? { seats: Number(data.seats) || old.seats } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.available !== undefined ? { available: data.available !== "false" } : {}),
      ...(data.pickupLocation !== undefined ? { pickupLocation: data.pickupLocation.trim() } : {}),
      ...(data.ownerPhone !== undefined ? { ownerPhone: data.ownerPhone.trim() } : {}),
      ...(prepayPercent !== undefined ? { prepayPercent } : {}),
      imageUrl,
    },
  });
  return NextResponse.json({ car });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  const { id } = await params;
  await db.car.delete({ where: { id: Number(id) } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
