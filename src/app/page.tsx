import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6 text-center">
      <h1 className="text-3xl font-bold">Car Rental</h1>
      <p className="mt-2 text-gray-600">
        Make an account, check your Gmail, verify your licence, and see cars.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/cars" className="rounded bg-black px-4 py-2 text-white">
          See cars
        </Link>
        <Link href="/register" className="rounded border px-4 py-2">
          Create account
        </Link>
        <Link href="/verify-email" className="rounded border px-4 py-2">
          Gmail check
        </Link>
        <Link href="/verify" className="rounded border px-4 py-2">
          Licence check
        </Link>
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Module 1: login. Module 2: licence. Module 3: cars + Gmail code.
      </p>
    </main>
  );
}
