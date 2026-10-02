"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CONTRACT_TEXT } from "@/lib/contract";

type Detail = {
  booking: {
    id: number;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: string;
    contractSigned: boolean;
    contractName: string;
    paymentStatus: string;
    prepayPercent: number;
    prepayAmount: number;
    restAmount: number;
  };
  car: { id: number; name: string; city: string; pricePerDay: number };
  pickup: { location: string; ownerPhone: string } | null;
};

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("Loading...");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function load() {
    const res = await fetch(`/api/bookings/${id}`);
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error ?? "No booking.");
      return;
    }
    setData(d);
    setMsg("");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function sign() {
    setError("");
    setWorking(true);
    try {
      const res = await fetch(`/api/bookings/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, agree }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Sign failed.");
        return;
      }
      load();
    } finally {
      setWorking(false);
    }
  }

  async function pay() {
    setError("");
    setWorking(true);
    try {
      const res = await fetch(`/api/bookings/${id}/pay`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Pay failed.");
        return;
      }
      load();
    } finally {
      setWorking(false);
    }
  }

  if (msg) return <main className="mx-auto max-w-xl p-6"><p className="text-sm">{msg} <Link href="/bookings" className="underline">My bookings</Link></p></main>;
  if (!data) return null;

  const b = data.booking;

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href="/bookings" className="text-sm underline">← My bookings</Link>
      <h1 className="mt-2 text-2xl font-bold">{data.car.name}</h1>
      <p className="text-sm text-gray-600">
        {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)} — Total ${b.totalPrice}
      </p>
      <p className="mt-1 text-sm">
        Prepay online: <strong>{b.prepayPercent}% = ${b.prepayAmount}</strong> — Rest to owner: <strong>${b.restAmount}</strong>
      </p>

      <div className="mt-4 rounded border p-4">
        <p className="font-bold">Step 1. Contract {b.contractSigned ? "✓ signed" : ""}</p>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">{CONTRACT_TEXT}</pre>
        {!b.contractSigned ? (
          <div className="mt-3">
            <input
              className="w-full rounded border p-2"
              placeholder="Type your full name as signature"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              I agree. If I damage the car, I pay repair at my cost.
            </label>
            <button onClick={sign} disabled={working} className="mt-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50">
              Sign contract
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-green-700">Signed by {b.contractName} ✓</p>
        )}
      </div>

      <div className="mt-4 rounded border p-4">
        <p className="font-bold">Step 2. Pay prepay {b.paymentStatus === "PAID" ? "✓ paid" : ""}</p>
        {!b.contractSigned ? (
          <p className="mt-1 text-sm text-gray-500">Sign the contract first.</p>
        ) : b.paymentStatus === "PAID" ? (
          <p className="mt-1 text-sm text-green-700">Prepay ${b.prepayAmount} paid ✓ (demo). Rest ${b.restAmount} goes to the owner in person.</p>
        ) : (
          <div className="mt-2">
            <p className="text-sm">Pay only <strong>${b.prepayAmount}</strong> online now (demo). Rest later to owner.</p>
            <button onClick={pay} disabled={working} className="mt-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50">
              Pay ${b.prepayAmount} now (demo)
            </button>
            <p className="mt-1 text-xs text-gray-500">Real card pay comes later. No real money now.</p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded border p-4">
        <p className="font-bold">Step 3. Car location + owner</p>
        {data.pickup ? (
          <div className="mt-1 text-sm">
            <p><strong>Exact place:</strong> {data.pickup.location || "Ask owner"}</p>
            <p><strong>Owner number:</strong> <a href={`tel:${data.pickup.ownerPhone}`} className="underline">{data.pickup.ownerPhone || "Ask"}</a></p>
            <p className="mt-1 text-xs text-gray-500">Call the owner before you go.</p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Hidden until prepay is paid. Only city is shown before: {data.car.city}.</p>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
