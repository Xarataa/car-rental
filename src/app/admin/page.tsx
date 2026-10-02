"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  userId: number;
  status: string;
  idFrontUrl: string;
  selfieUrl: string;
  faceScore: number | null;
  faceMatch: boolean;
  reason: string | null;
  user: { id: number; name: string; email: string };
};

export default function AdminPage() {
  const [list, setList] = useState<Item[]>([]);
  const [msg, setMsg] = useState("Loading...");

  async function load() {
    setMsg("Loading...");
    const res = await fetch("/api/admin/verifications");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Need login.");
      return;
    }
    setList(data.list);
    setMsg(data.list.length ? "" : "No uploads yet.");
  }

  useEffect(() => {
    load();
  }, []);

  async function act(userId: number, action: "approve" | "reject") {
    const reason = action === "reject" ? prompt("Why reject?") ?? "" : "";
    const res = await fetch("/api/admin/verify-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed");
      return;
    }
    load();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Admin - licence checks</h1>
      <p className="mt-1 text-sm text-gray-600">
        Demo admin. Any logged user can open for now.
      </p>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <div className="mt-4 grid gap-4">
        {list.map((v) => (
          <div key={v.id} className="rounded border p-3">
            <p className="text-sm">
              <strong>{v.user.name}</strong> ({v.user.email}) —{" "}
              <strong>{v.status}</strong>
              {v.faceScore !== null
                ? ` — score ${Number(v.faceScore).toFixed(3)}`
                : ""}
            </p>
            {v.reason ? (
              <p className="text-xs text-gray-600">{v.reason}</p>
            ) : null}
            <div className="mt-2 flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.idFrontUrl} alt="id" className="max-h-40 rounded border" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.selfieUrl} alt="selfie" className="max-h-40 rounded border" />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(v.userId, "approve")}
                className="rounded bg-green-700 px-3 py-1 text-sm text-white"
              >
                Approve
              </button>
              <button
                onClick={() => act(v.userId, "reject")}
                className="rounded bg-red-700 px-3 py-1 text-sm text-white"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
