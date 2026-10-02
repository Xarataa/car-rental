"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  contractSigned: boolean;
  paymentStatus: string;
  prepayPercent: number;
  prepayAmount: number;
  car: { id: number; name: string; city: string; pricePerDay: number };
};

function stepOf(b: Booking) {
  if (b.status === "CANCELLED") return "cancelled";
  if (b.paymentStatus === "PAID") return "pickup info open";
  if (b.contractSigned) return "pay prepay now";
  return "sign contract now";
}

export default function BookingsPage() {
  const [list, setList] = useState<Booking[]>([]);
  const [msg, setMsg] = useState("Loading...");

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Please log in first.");
      return;
    }
    setList(data.bookings ?? []);
    setMsg(data.bookings?.length ? "" : "No bookings yet. Pick a car and rent.");
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: number) {
    if (!confirm("Cancel this booking? Owner keeps the prepay part.")) return;
    await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    load();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">My bookings</h1>
      {msg ? <p className="mt-3 text-sm">{msg} <Link href="/cars" className="underline">See cars</Link></p> : null}
      <div className="mt-4 grid gap-3">
        {list.map((b) => (
          <div key={b.id} className="rounded border p-3 text-sm">
            <p>
              <Link href={`/bookings/${b.id}`} className="font-bold underline">Booking {b.id}: {b.car.name}</Link>
              {" "}— {b.car.city} — <strong>{b.status}</strong>
            </p>
            <p className="text-gray-600">
              {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)} — Total ${b.totalPrice} — Prepay {b.prepayPercent}% = ${b.prepayAmount} — {b.paymentStatus}
            </p>
            <p className="text-gray-600">
              Next: <Link href={`/bookings/${b.id}`} className="underline">{stepOf(b)}</Link>
            </p>
            {b.status === "CONFIRMED" ? (
              <button onClick={() => cancel(b.id)} className="mt-1 text-sm underline">
                Cancel
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
