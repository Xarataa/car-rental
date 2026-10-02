"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type User = { id: number; name: string; email: string } | null;

export default function Nav() {
  const [user, setUser] = useState<User>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b p-4">
      <Link href="/" className="font-bold">
        Car Rental
      </Link>
      <div className="flex gap-3 text-sm">
        <Link href="/cars">Cars</Link>
        <Link href="/bookings">My bookings</Link>
        <Link href="/verify">Verify</Link>
        <Link href="/admin/cars">Cars admin</Link>
        <Link href="/admin/bookings">Rents</Link>
        <Link href="/admin">Checks</Link>
        {user ? (
          <>
            <Link href="/profile">Hi, {user.name}</Link>
            <button onClick={logout} className="underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
