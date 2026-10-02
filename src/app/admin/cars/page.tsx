"use client";

import { useEffect, useState } from "react";

type Car = {
  id: number;
  name: string;
  brand: string;
  carType: string;
  city: string;
  pricePerDay: number;
  seats: number;
  imageUrl: string;
  description: string;
  available: boolean;
  prepayPercent: number;
};

const empty = { name: "", brand: "", carType: "", city: "", pricePerDay: "", seats: "4", description: "", available: "true", prepayPercent: "10", pickupLocation: "", ownerPhone: "" };

export default function AdminCarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [msg, setMsg] = useState("Loading...");
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [image, setImage] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/cars");
    const data = await res.json();
    setCars(data.cars ?? []);
    setMsg(data.cars?.length ? "" : "No cars yet.");
  }

  useEffect(() => {
    load();
  }, []);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Saving...");
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.append(k, v);
    if (image) fd.append("image", image);
    const url = editId ? `/api/cars/${editId}` : "/api/cars";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Save failed.");
      return;
    }
    setForm(empty);
    setImage(null);
    setEditId(null);
    setMsg("Saved.");
    load();
  }

  function edit(c: Car) {
    setEditId(c.id);
    setForm({
      name: c.name,
      brand: c.brand,
      carType: c.carType,
      city: c.city,
      pricePerDay: String(c.pricePerDay),
      seats: String(c.seats),
      description: c.description,
      available: String(c.available),
      prepayPercent: String(c.prepayPercent ?? 10),
      pickupLocation: "",
      ownerPhone: "",
    });
    window.scrollTo(0, 0);
  }

  async function del(id: number) {
    if (!confirm("Remove this car?")) return;
    await fetch(`/api/cars/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Admin - cars</h1>
      <form onSubmit={save} className="mt-4 grid gap-2 rounded border p-3">
        <p className="text-sm font-bold">{editId ? `Edit car ${editId}` : "Add new car"}</p>
        <input className="rounded border p-2" placeholder="Name *" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded border p-2" placeholder="Brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          <input className="rounded border p-2" placeholder="Type (Sedan, SUV...)" value={form.carType} onChange={(e) => set("carType", e.target.value)} />
          <input className="rounded border p-2" placeholder="City *" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <input className="rounded border p-2" placeholder="Price per day *" value={form.pricePerDay} onChange={(e) => set("pricePerDay", e.target.value)} />
          <input className="rounded border p-2" placeholder="Seats" value={form.seats} onChange={(e) => set("seats", e.target.value)} />
          <select className="rounded border p-2" value={form.prepayPercent} onChange={(e) => set("prepayPercent", e.target.value)}>
            <option value="10">Prepay 10% online</option>
            <option value="20">Prepay 20% online</option>
          </select>
          <select className="rounded border p-2" value={form.available} onChange={(e) => set("available", e.target.value)}>
            <option value="true">Free</option>
            <option value="false">Busy</option>
          </select>
          <input className="rounded border p-2" placeholder="Exact pickup place (secret until paid)" value={form.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} />
          <input className="rounded border p-2" placeholder="Owner phone (secret until paid)" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} />
        </div>
        <input className="rounded border p-2" placeholder="About the car" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">Save</button>
          {editId ? <button type="button" className="rounded border px-4 py-2" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button> : null}
        </div>
      </form>

      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <div className="mt-4 grid gap-3">
        {cars.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <span><strong>{c.name}</strong> — {c.city} — ${c.pricePerDay}/day — prepay {c.prepayPercent}% {c.available ? "" : "(busy)"}</span>
            <span className="flex gap-2">
              <button className="underline" onClick={() => edit(c)}>Edit</button>
              <button className="underline" onClick={() => del(c.id)}>Remove</button>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
