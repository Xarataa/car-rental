import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");

  const full = await db.user.findUnique({ where: { id: user.id } });
  const v = await db.verification.findUnique({ where: { userId: user.id } });

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">My profile</h1>
      <div className="mt-4 rounded border p-4">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p className="text-sm text-gray-500">
          Made on: {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="mt-4 rounded border p-4">
        <p>
          <strong>Gmail check:</strong> {full?.emailVerified ? "YES" : "NO"}
        </p>
        {!full?.emailVerified ? (
          <Link href="/verify-email" className="mt-2 inline-block rounded bg-black px-3 py-1 text-sm text-white">
            Check Gmail
          </Link>
        ) : null}
      </div>
      <div className="mt-4 rounded border p-4">
        <p>
          <strong>Licence check:</strong> {v?.status ?? "NONE"}
        </p>
        {v?.reason ? (
          <p className="text-sm text-gray-600">{v.reason}</p>
        ) : null}
        <Link href="/verify" className="mt-2 inline-block rounded bg-black px-3 py-1 text-sm text-white">
          Go to verify
        </Link>
      </div>
      <div className="mt-4 rounded border p-4">
        <Link href="/bookings" className="font-bold underline">My bookings</Link>
        <span className="text-sm text-gray-500"> — rent needs Gmail YES + licence VERIFIED</span>
      </div>
    </main>
  );
}
