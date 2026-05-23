# Allo Engineering - Take-Home Exercise (Inventory Reservation System)

## Overview

This is a Next.js full-stack application built for the Allo Engineering take-home exercise. It implements an inventory reservation system to solve the checkout race condition where multiple users attempt to purchase the same physical unit concurrently.

The system uses:
- **Next.js 15 (App Router)** for both Frontend and API Routes.
- **TypeScript** end-to-end.
- **Prisma** with **PostgreSQL** for the data layer.
- **Tailwind CSS + shadcn/ui** for the UI.

## Getting Started Locally

### Prerequisites
1. Node.js (v18+)
2. A Postgres database (e.g., Neon or Supabase free tier).

### Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Rename `.env.example` to `.env` and fill in your connection strings:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   ```

3. **Database Migration & Seeding:**
   Run the following commands to initialize your database schema and seed it with dummy data (Warehouses, Products, and Stock):
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with the application.

## Core Mechanisms & Trade-offs

### Concurrency Correctness (The Race Condition)
When multiple users click "Reserve" at the exact same moment for the last available unit of a product at a specific warehouse, we must guarantee only one succeeds.

**Approach used**: **Postgres Transaction + Row-Level Lock (`SELECT ... FOR UPDATE`)**
- Before checking stock availability and updating the database, the API endpoint starts a Prisma transaction and acquires a row-level lock specific to the `stockId` via a raw query (`SELECT * FROM "Stock" WHERE id = $1 FOR UPDATE`).
- This guarantees that any concurrent requests for the exact same stock item will queue up at the database level and be processed sequentially.
- Once the lock is acquired, it evaluates stock availability. If available, it creates the reservation and increments `reservedUnits`. If not, it rolls back and returns a `409 Conflict`.
- **Why this approach?** It elegantly prevents race conditions entirely natively within Postgres without requiring a separate external dependency like Redis. 

### Expiry Mechanism (Lazy Cleanup)
Reservations expire after 10 minutes. How do we return these expired units to the available pool?

**Approach used**: **Lazy Evaluation on Read/Write**
- Within the same locked transaction as above, before calculating available stock, the system checks for any reservations associated with that `stockId` where `expiresAt < now()` and `status == 'PENDING'`.
- If expired reservations are found, they are immediately marked as `RELEASED`, and the `reservedUnits` on the stock model is decremented in the transaction.
- Then the actual available stock is calculated.
- If a user tries to confirm an expired reservation, the `/api/reservations/:id/confirm` endpoint will detect the expiry, release the stock, and return a `410 Gone`.

### Idempotency (Bonus)
The frontend generates a `crypto.randomUUID()` and sends it as an `Idempotency-Key` header during the `POST /api/reservations` request.
- The `Reservation` model has a unique `idempotencyKey` field.
- The API checks if a reservation with this key already exists before processing. If it does, it simply returns the existing reservation without repeating the side effect.
- The `confirm` and `release` endpoints are also naturally idempotent.

## Demo Flow
1. **Product Listing (`/`)**: Displays available stock. Click "Reserve" to create a reservation.
2. **Checkout (`/checkout/:id`)**: Shows a live 10-minute countdown timer.
3. Let the timer expire, then try to confirm -> you'll get a 410 Gone.
