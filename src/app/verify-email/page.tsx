"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const d = sessionStorage.getItem("demoCode");
    if (d) setDemoCode(d);
    fetch("/api/auth/verify-email")
      .then((r) => r.json())
      .then((data) => {
        if (data.email) setEmail(data.email);
        if (data.emailVerified) router.push("/profile");
      })
      .catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Wrong code.");
      return;
    }
    sessionStorage.removeItem("demoCode");
    router.push("/profile");
    router.refresh();
  }

  async function resend() {
    setError("");
    setMsg("");
    const res = await fetch("/api/auth/send-code", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    if (data.demoCode) {
      setDemoCode(String(data.demoCode));
      sessionStorage.setItem("demoCode", String(data.demoCode));
    }
    setMsg(data.emailSent ? "Code sent to your Gmail." : "New demo code made.");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Check your Gmail</h1>
      <p className="mt-1 text-sm text-gray-600">
        We sent a 6-number code{email ? ` to ${email}` : ""}. It ends in 15 minutes.
      </p>
      {demoCode ? (
        <p className="mt-3 rounded bg-yellow-100 p-2 text-sm">
          Demo code for now: <strong>{demoCode}</strong> (real Gmail later)
        </p>
      ) : null}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <input
          className="rounded border p-2"
          placeholder="6-number code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button className="rounded bg-black p-2 text-white" type="submit">
          Check code
        </button>
      </form>
      <button onClick={resend} className="mt-3 text-sm underline">
        Send new code
      </button>
    </main>
  );
}
