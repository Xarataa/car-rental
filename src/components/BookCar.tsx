"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDay(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function expandBusy(busy: { startDate: string; endDate: string }[]): Set<string> {
  const set = new Set<string>();
  for (const b of busy) {
    const s = parseDay(b.startDate.slice(0, 10));
    const e = parseDay(b.endDate.slice(0, 10));
    if (!s || !e) continue;
    const cur = new Date(s);
    while (cur <= e) {
      set.add(toStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return set;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MonthGrid({
  year,
  month,
  start,
  end,
  busySet,
  today,
  onPick,
}: {
  year: number;
  month: number;
  start: string;
  end: string;
  busySet: Set<string>;
  today: string;
  onPick: (day: string) => void;
}) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    // Monday-first grid
    const lead = (first.getDay() + 6) % 7;
    const daysIn = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysIn; d++) arr.push(d);
    return arr;
  }, [year, month]);

  const sD = parseDay(start);
  const eD = parseDay(end);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const str = toStr(new Date(year, month, d));
          const disabled = str < today || busySet.has(str);
          const isStart = str === start;
          const isEnd = str === end;
          const inRange =
            sD && eD && str > start && str < end;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(str)}
              className={`rounded p-1.5 text-sm ${
                disabled
                  ? "text-gray-300 line-through"
                  : isStart || isEnd
                    ? "bg-black font-bold text-white"
                    : inRange
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookCar({ carId, pricePerDay }: { carId: number; pricePerDay: number }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState<{ startDate: string; endDate: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [bookedId, setBookedId] = useState<number | null>(null);
  const [openCal, setOpenCal] = useState<"start" | "end" | null>(null);
  const today = useMemo(() => toStr(new Date()), []);

  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());

  const busySet = useMemo(() => expandBusy(busy), [busy]);

  useEffect(() => {
    fetch(`/api/bookings?carId=${carId}`)
      .then((r) => r.json())
      .then((d) => setBusy(d.busy ?? []))
      .catch(() => {});
  }, [carId]);

  // Keep calendar view on the field being picked
  useEffect(() => {
    if (openCal === "start" && start) {
      const d = parseDay(start);
      if (d) {
        setViewY(d.getFullYear());
        setViewM(d.getMonth());
      }
    }
    if (openCal === "end" && end) {
      const d = parseDay(end);
      if (d) {
        setViewY(d.getFullYear());
        setViewM(d.getMonth());
      }
    }
  }, [openCal, start, end]);

  function moveMonth(dir: 1 | -1) {
    const d = new Date(viewY, viewM + dir, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }

  function pick(day: string) {
    if (openCal === "start") {
      setStart(day);
      if (end && day > end) setEnd("");
      setOpenCal("end");
    } else if (openCal === "end") {
      if (start && day < start) {
        setError("End day must be after start day.");
        return;
      }
      setEnd(day);
      setError("");
      setOpenCal(null);
    }
  }

  const days =
    start && end
      ? Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
  const total = days > 0 ? Math.round(days * pricePerDay * 100) / 100 : 0;

  async function rent() {
    setError("");
    setMsg("");
    if (!start || !end) {
      setError("Pick start and end days from the calendar.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, startDate: start, endDate: end }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Rent failed.");
        return;
      }
      setMsg(`Booked! Now sign the contract, then pay ${data.booking.prepayPercent}% prepay.`);
      setBookedId(data.booking.id);
      fetch(`/api/bookings?carId=${carId}`)
        .then((r) => r.json())
        .then((d) => setBusy(d.busy ?? []))
        .catch(() => {});
    } catch {
      setError("Rent failed. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-500">Rent price</p>
      <p className="text-2xl font-bold">${pricePerDay}/day</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-sm">From</p>
          <button
            type="button"
            onClick={() => setOpenCal(openCal === "start" ? null : "start")}
            className={`mt-1 w-full rounded border p-2 text-left ${openCal === "start" ? "border-black ring-1 ring-black" : ""}`}
          >
            {start || "📅 Pick day"}
          </button>
        </div>
        <div>
          <p className="text-sm">To</p>
          <button
            type="button"
            onClick={() => setOpenCal(openCal === "end" ? null : "end")}
            className={`mt-1 w-full rounded border p-2 text-left ${openCal === "end" ? "border-black ring-1 ring-black" : ""}`}
          >
            {end || "📅 Pick day"}
          </button>
        </div>
      </div>

      {openCal ? (
        <div className="mt-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded border px-2 py-1">←</button>
            <p className="font-bold">{MONTHS[viewM]} {viewY}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveMonth(1)} className="rounded border px-2 py-1">→</button>
              <button type="button" onClick={() => setOpenCal(null)} className="rounded border px-2 py-1">✕</button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Picking: <strong>{openCal === "start" ? "start day" : "end day"}</strong> — crossed days are past or busy.
          </p>
          <div className="mt-2">
            <MonthGrid
              year={viewY}
              month={viewM}
              start={start}
              end={end}
              busySet={busySet}
              today={today}
              onPick={pick}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setStart("");
              setEnd("");
              setOpenCal(null);
            }}
            className="mt-2 text-xs underline"
          >
            Clear days
          </button>
        </div>
      ) : null}

      {days > 0 ? (
        <p className="mt-2 text-sm">Days: <strong>{days}</strong> — Total: <strong>${total}</strong></p>
      ) : null}
      {busy.length > 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          Busy days: {busy.map((b) => `${b.startDate.slice(0, 10)} → ${b.endDate.slice(0, 10)}`).join(", ")}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-600">
          {error}{" "}
          {error.includes("Gmail") ? <Link href="/verify-email" className="underline">Check Gmail</Link> : null}
          {error.includes("licence") ? <Link href="/verify" className="underline">Verify licence</Link> : null}
          {error.includes("log in") ? <Link href="/login" className="underline">Log in</Link> : null}
        </p>
      ) : null}
      {msg ? <p className="mt-2 text-sm text-green-700">{msg} {bookedId ? <Link href={`/bookings/${bookedId}`} className="underline">Go to contract →</Link> : <Link href="/bookings" className="underline">My bookings</Link>}</p> : null}
      <button onClick={rent} disabled={sending} className="mt-3 w-full rounded bg-black px-4 py-2 font-bold text-white disabled:opacity-50">
        {sending ? "Booking..." : "Rent this car"}
      </button>
      <p className="mt-2 text-xs text-gray-500">Only Gmail-checked + licence-verified users can rent.</p>
    </div>
  );
}
