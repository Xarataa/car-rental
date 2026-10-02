"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  contractSigned: boolean;
  paymentStatus: string;
  prepayPercent: number;
  prepayAmount: number;
  car: { id: number; name: string; city: string };
  user: { id: number; name: string; email: string };
};

export default function AdminBookingsPage() {
  const [list, setList] = useState<Item[]>([]);
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((r) => r.json())
      .then((d) => {
        if (d.list) {
          setList(d.list);
          setMsg(d.list.length ? "" : "No bookings yet.");
        } else {
          setMsg(d.error ?? "Need login.");
        }
      })
      .catch(() => setMsg("Failed."));
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Admin - bookings</h1>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <div className="mt-4 grid gap-3 text-sm">
        {list.map((b) => (
          <div key={b.id} className="rounded border p-3">
            <p>
              <strong>{b.car.name}</strong> ({b.car.city}) — {b.user.name} ({b.user.email}) — <strong>{b.status}</strong>
            </p>
            <p className="text-gray-600">
              {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)} — Total ${b.totalPrice} — Prepay {b.prepayPercent}% = ${b.prepayAmount}
            </p>
            <p className="text-gray-600">
              Contract: {b.contractSigned ? "signed ✓" : "not signed"} — Pay: {b.paymentStatus}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
