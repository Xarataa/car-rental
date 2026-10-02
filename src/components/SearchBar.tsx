"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ cities }: { cities: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [city, setCity] = useState(sp.get("city") ?? "");
  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");

  function search() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city.trim()) p.set("city", city.trim());
    if (minPrice.trim()) p.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) p.set("maxPrice", maxPrice.trim());
    router.push(`/cars${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function clear() {
    setQ("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/cars");
  }

  return (
    <div className="mt-4 rounded border p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          className="rounded border p-2"
          placeholder="Car, brand or type"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <select className="rounded border p-2" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          className="rounded border p-2"
          placeholder="Min $/day"
          inputMode="numeric"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <input
          className="rounded border p-2"
          placeholder="Max $/day"
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={search} className="rounded bg-black px-4 py-2 text-white">
          Search
        </button>
        <button onClick={clear} className="rounded border px-4 py-2">
          Clear
        </button>
      </div>
    </div>
  );
}
