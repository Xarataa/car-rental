import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

type SP = { q?: string; city?: string; minPrice?: string; maxPrice?: string };

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const city = (sp.city ?? "").trim();
  const minPrice = Number(sp.minPrice ?? "");
  const maxPrice = Number(sp.maxPrice ?? "");

  const priceFilter: { gte?: number; lte?: number } = {};
  if (sp.minPrice !== undefined && sp.minPrice !== "" && !Number.isNaN(minPrice)) priceFilter.gte = minPrice;
  if (sp.maxPrice !== undefined && sp.maxPrice !== "" && !Number.isNaN(maxPrice)) priceFilter.lte = maxPrice;

  const where = {
    ...(q
      ? { OR: [{ name: { contains: q } }, { brand: { contains: q } }, { carType: { contains: q } }] }
      : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(Object.keys(priceFilter).length > 0 ? { pricePerDay: priceFilter } : {}),
  };

  const cars = await db.car.findMany({
    where,
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
    },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  const cityRows = await db.car.findMany({ select: { city: true }, distinct: ["city"] }).catch(() => []);
  const cities = cityRows.map((c) => c.city);

  const hasFilter = q || city || sp.minPrice || sp.maxPrice;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Cars for rent</h1>
      <p className="mt-1 text-sm text-gray-600">
        All people can see. Only checked users can rent (rent comes in Module 5).
      </p>
      <Suspense>
        <SearchBar cities={cities} />
      </Suspense>
      <p className="mt-3 text-sm text-gray-600">
        Found: <strong>{cars.length}</strong>
        {hasFilter ? " (with filter)" : ""}
      </p>
      {cars.length === 0 ? (
        <p className="mt-4 rounded border p-4 text-sm">No cars found. Try other words or prices.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {cars.map((c) => (
            <Link key={c.id} href={`/cars/${c.id}`} className="rounded border p-3 hover:shadow">
              {c.imageUrl ? (
                <Image src={c.imageUrl} alt={c.name} width={600} height={400} className="h-44 w-full rounded object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center rounded bg-gray-100 text-sm text-gray-500">
                  No photo
                </div>
              )}
              <p className="mt-2 font-bold">{c.name}</p>
              <p className="text-sm text-gray-600">
                {c.city} — ${c.pricePerDay}/day {c.available ? "" : "(busy)"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
