import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_IMG = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

async function seedIfEmpty() {
  const n = await db.car.count();
  if (n > 0) return;
  await db.car.createMany({
    data: [
      {
        name: "Toyota Corolla",
        brand: "Toyota",
        carType: "Sedan",
        city: "Tbilisi",
        pricePerDay: 45,
        seats: 5,
        description: "Good city car, low fuel.",
      },
      {
        name: "Honda CR-V",
        brand: "Honda",
        carType: "SUV",
        city: "Batumi",
        pricePerDay: 70,
        seats: 5,
        description: "Big car for family and trips.",
      },
      {
        name: "Tesla Model 3",
        brand: "Tesla",
        carType: "Electric",
        city: "Tbilisi",
        pricePerDay: 90,
        seats: 5,
        description: "Electric, fast and quiet.",
      },
    ],
  });
}

export async function GET(req: Request) {
  await seedIfEmpty();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const city = (url.searchParams.get("city") ?? "").trim();
  const minPrice = Number(url.searchParams.get("minPrice") ?? "");
  const maxPrice = Number(url.searchParams.get("maxPrice") ?? "");

  const priceFilter: { gte?: number; lte?: number } = {};
  if (url.searchParams.get("minPrice") !== null && url.searchParams.get("minPrice") !== "" && !Number.isNaN(minPrice)) {
    priceFilter.gte = minPrice;
  }
  if (url.searchParams.get("maxPrice") !== null && url.searchParams.get("maxPrice") !== "" && !Number.isNaN(maxPrice)) {
    priceFilter.lte = maxPrice;
  }

  const publicSelect = {
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
  } as const;

  const cars = await db.car.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { brand: { contains: q } },
              { carType: { contains: q } },
            ],
          }
        : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(Object.keys(priceFilter).length > 0 ? { pricePerDay: priceFilter } : {}),
    },
    select: publicSelect,
    orderBy: { createdAt: "desc" },
  });

  const cities = await db.car.findMany({ select: { city: true }, distinct: ["city"] });

  return NextResponse.json({ cars, cities: cities.map((c) => c.city) });
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  let data: Record<string, string> = {};
  let imageUrl = "";

  const ctype = req.headers.get("content-type") ?? "";
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
    } else {
      imageUrl = data.imageUrl ?? "";
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad data." }, { status: 400 });
    for (const k of ["name", "brand", "carType", "city", "pricePerDay", "seats", "description", "available", "imageUrl", "pickupLocation", "ownerPhone", "prepayPercent"]) {
      if (body[k] !== undefined) data[k] = String(body[k]);
    }
    imageUrl = data.imageUrl ?? "";
  }

  if (!data.name || !data.city || !data.pricePerDay) {
    return NextResponse.json({ error: "Name, city and price are needed." }, { status: 400 });
  }
  const price = Number(data.pricePerDay);
  if (Number.isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be more than 0." }, { status: 400 });
  }
  let prepayPercent = Math.round(Number(data.prepayPercent ?? 10));
  if (Number.isNaN(prepayPercent)) prepayPercent = 10;
  prepayPercent = Math.min(100, Math.max(1, prepayPercent));

  const car = await db.car.create({
    data: {
      name: data.name.trim(),
      brand: (data.brand ?? "").trim(),
      carType: (data.carType ?? "").trim(),
      city: data.city.trim(),
      pricePerDay: price,
      seats: Number(data.seats ?? 4) || 4,
      description: (data.description ?? "").trim(),
      available: data.available === undefined ? true : data.available !== "false",
      imageUrl,
      pickupLocation: (data.pickupLocation ?? "").trim(),
      ownerPhone: (data.ownerPhone ?? "").trim(),
      prepayPercent,
    },
  });
  return NextResponse.json({ car });
}
