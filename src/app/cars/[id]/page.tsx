import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BookCar from "@/components/BookCar";

export const dynamic = "force-dynamic";

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
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
    },
  }).catch(() => null);
  if (!car) notFound();

  const similar = await db.car
    .findMany({
      where: {
        id: { not: car.id },
        OR: [{ city: car.city }, { carType: car.carType }],
      },
      select: {
        id: true,
        name: true,
        city: true,
        pricePerDay: true,
        imageUrl: true,
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const weekPrice = Math.round(car.pricePerDay * 7 * 0.9);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/cars" className="text-sm underline">← Back to all cars</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{car.name}</h1>
          <p className="text-sm text-gray-500">
            {car.brand || "-"} · {car.carType || "-"} · {car.city}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">${car.pricePerDay}<span className="text-sm font-normal text-gray-500">/day</span></p>
          <p className={`text-xs ${car.available ? "text-green-700" : "text-red-600"}`}>
            {car.available ? "● Free now" : "● Busy now"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {car.imageUrl ? (
            <Image src={car.imageUrl} alt={car.name} width={900} height={560} className="w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
              No photo yet
            </div>
          )}

          <div className="mt-4 rounded-lg border">
            <p className="border-b px-4 py-2 font-bold">About this car</p>
            <p className="px-4 py-3 text-sm">{car.description || "No extra info."}</p>
          </div>

          <div className="mt-4 rounded-lg border">
            <p className="border-b px-4 py-2 font-bold">Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm sm:grid-cols-3">
              <span><span className="text-gray-500">Brand:</span> <strong>{car.brand || "-"}</strong></span>
              <span><span className="text-gray-500">Type:</span> <strong>{car.carType || "-"}</strong></span>
              <span><span className="text-gray-500">City:</span> <strong>{car.city}</strong></span>
              <span><span className="text-gray-500">Seats:</span> <strong>{car.seats}</strong></span>
              <span><span className="text-gray-500">Per day:</span> <strong>${car.pricePerDay}</strong></span>
              <span><span className="text-gray-500">Per week:</span> <strong>${weekPrice}</strong></span>
              <span><span className="text-gray-500">Prepay online:</span> <strong>{car.prepayPercent}%</strong></span>
            </div>
            <p className="px-4 pb-3 text-xs text-gray-500">You pay only {car.prepayPercent}% online now. Rest goes to the owner in person. Exact place + owner number open after prepay.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <BookCar carId={car.id} pricePerDay={car.pricePerDay} />

          <div className="rounded-lg border p-4 text-sm">
            <p className="font-bold">Owner</p>
            <p className="mt-1">Car Rental Company</p>
            <p className="text-gray-500">{car.city}</p>
            <p className="mt-2 rounded bg-yellow-50 p-2 text-xs text-gray-600">
              Tip: check the car before you pay. Take photos at pickup.
            </p>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="mt-8">
          <p className="font-bold">Same kind cars</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {similar.map((s) => (
              <Link key={s.id} href={`/cars/${s.id}`} className="rounded border p-2 text-sm hover:shadow">
                {s.imageUrl ? (
                  <Image src={s.imageUrl} alt={s.name} width={400} height={260} className="h-28 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">No photo</div>
                )}
                <p className="mt-1 font-bold">{s.name}</p>
                <p className="text-gray-600">{s.city} — ${s.pricePerDay}/day</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
