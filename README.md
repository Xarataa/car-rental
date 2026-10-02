# Car Rental

Car rental website. Customer signs up, checks Gmail with a code,
verifies licence with a live selfie, searches cars, books,
signs the contract, pays prepay online (10% or 20%), pays the rest
to the owner, then sees the exact pickup place + owner phone.

## Start

1. Install: `pnpm install` (run `pnpm approve-builds --all` if asked)
2. Copy `.env.example` to `.env` and set `AUTH_SECRET`
3. Make database: `pnpm exec prisma db push`
4. Run: `pnpm dev` → http://localhost:3000

## Parts

1. Login: sign up, log in, log out, profile
2. Licence check: ID photo + live selfie, face match, admin approve
3. Cars + Gmail code: car list, car page, admin cars, Gmail check
4. Search: by car words, city, min/max price
5. Rent: calendar dates, contract sign, prepay online, pickup info
6. Admin: checks, cars, bookings

Demo now, real providers later: Gmail send (`GMAIL_USER` + `GMAIL_PASS`),
ID service (replace local face check), card pay (prepay online).
