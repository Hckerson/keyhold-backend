# Real Estate MVP 1 - Complete Setup Guide

## 🏠 What You Get

A production-ready real estate platform where users can:

1. **Search & Discover** — Browse available properties with filters
2. **Express Interest** — Connect with property owners
3. **Communicate** — Chat with buyers/sellers about properties
4. **Schedule Viewings** — Arrange property inspections
5. **Negotiate** — Make offers and counter-offers
6. **Purchase** — Real Stripe payment processing
7. **Review** — Rate transactions post-purchase

---

## 🔧 Prerequisites

- Node.js 18+
- PostgreSQL database
- API Keys (see section below)

---

## 📋 API Keys You Need to Get

### 1. **Stripe** (Payment Processing)

- Go to: https://dashboard.stripe.com/
- Create a test account
- Get: `STRIPE_API_KEY` (starts with `sk_test_`)
- Get: `STRIPE_WEBHOOK_SECRET` (from Webhook settings)

### 2. **SendGrid** (Email Service)

- Go to: https://sendgrid.com/
- Create free account
- Create API key: Settings → API Keys → Create
- Get: `SENDGRID_API_KEY`
- Set: `SENDGRID_FROM_EMAIL` (any sender email you want)

### 3. **Cloudinary** (Image & Document Storage)

- Go to: https://cloudinary.com/
- Create free account
- Dashboard shows: `Cloud Name`, `API Key`, `API Secret`
- Copy all three

### 4. **Twilio** (SMS Notifications) — _Optional but recommended_

- Go to: https://www.twilio.com/
- Create trial account
- Get: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Buy a phone number or use trial number for `TWILIO_FROM_NUMBER`

---

## 🚀 Installation & Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env and fill in all API keys from above
nano .env  # or use your editor
```

### Step 3: Set Up Database

```bash
# Create Prisma migrations and sync database
npm run prisma:both

# Seed sample data (optional)
npm run seed
```

### Step 4: Start Development Server

```bash
npm run start:dev
```

Server runs at: `http://localhost:3000`

API Docs (Swagger): `http://localhost:3000/api`

---

## 🔄 Complete User Flow (MVP 1)

### **As a Seller (Property Owner)**

1. **Register**

    ```bash
    POST /auth/register
    {
      "email": "seller@example.com",
      "password": "password123",
      "fullName": "John Seller",
      "role": "SELLER",
      "phoneNumber": "+1234567890"
    }
    ```

2. **Create Property Listing**

    ```bash
    POST /properties
    Authorization: Bearer <token>
    {
      "title": "Beautiful 3BR House",
      "description": "Spacious home near downtown",
      "address": "123 Main St, City, ST 12345",
      "price": 350000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqFt": 1800,
      "type": "HOUSE",
      "amenities": ["Pool", "Garage", "Garden"],
      "features": ["Hardwood floors", "Updated kitchen"]
    }
    ```

3. **Upload Property Images**

    ```bash
    POST /properties/{propertyId}/images
    Authorization: Bearer <token>
    Content-Type: multipart/form-data
    (attach image files)
    ```

4. **Receive Buyer Interest**
    - Buyer expresses interest → You get EMAIL + SMS notification
    - Go to: `GET /connections/incoming`
    - Accept/Reject: `PATCH /connections/{connectionId}/accept` or `/reject`

5. **Chat with Buyer**
    - Messages arrive at: `GET /messages/connection/{connectionId}`
    - Send replies: `POST /messages`

6. **Receive Viewing Request**
    - Buyer requests viewing: `POST /viewings`
    - You get notified, propose times
    - Buyer confirms one: `PATCH /viewings/{id}/confirm`

7. **Negotiate Offer**
    - Buyer makes offer: `POST /offers`
    - You get EMAIL + SMS notification
    - Accept/Counter: `PATCH /offers/{id}/respond`

8. **Receive Payment**
    - Once buyer completes payment → Transaction marked COMPLETED
    - You get EMAIL confirmation
    - Property marked as SOLD

9. **Get Rated**
    - Buyer leaves review: `POST /reviews/transaction/{transactionId}`
    - Your rating updates: `GET /reviews/user/{userId}/rating`

---

### **As a Buyer (Property Seeker)**

1. **Register**

    ```bash
    POST /auth/register
    {
      "email": "buyer@example.com",
      "password": "password123",
      "fullName": "Jane Buyer",
      "role": "BUYER",
      "phoneNumber": "+9876543210"
    }
    ```

2. **Search Properties**

    ```bash
    GET /properties?status=AVAILABLE
    GET /properties/search?q=downtown
    GET /properties?minPrice=200000&maxPrice=500000&bedrooms=3
    ```

3. **View Property Details**

    ```bash
    GET /properties/{propertyId}
    # See: images, seller info, all details
    ```

4. **Express Interest**

    ```bash
    POST /connections
    { "propertyId": "{propertyId}" }
    # You get confirmation email
    # Seller gets notified
    ```

5. **Wait for Acceptance**
    - Seller accepts/rejects
    - Check status: `GET /connections/{connectionId}`

6. **Chat with Seller**
    - Send message: `POST /messages`
    - Seller responds
    - View chat: `GET /messages/connection/{connectionId}`

7. **Request Viewing**

    ```bash
    POST /viewings
    {
      "connectionId": "{connectionId}",
      "proposedTimes": ["2026-07-15T10:00:00Z", "2026-07-15T14:00:00Z"]
    }
    # Seller gets notified
    ```

8. **Confirm Viewing Time**
    - Seller confirms: `PATCH /viewings/{id}/confirm`
    - You get EMAIL + SMS reminder

9. **Make Offer**

    ```bash
    POST /offers
    {
      "connectionId": "{connectionId}",
      "offeredPrice": 340000,
      "offeredTerms": "30-day closing, inspection contingent",
      "expiresAt": "2026-07-20T23:59:59Z"
    }
    # Seller gets EMAIL + SMS notification
    ```

10. **Negotiate**
    - Seller counters/accepts: `GET /offers/connection/{connectionId}`
    - If countered, make new offer
    - If accepted → Ready to purchase

11. **Complete Purchase (REAL PAYMENT)**

    ```bash
    # Step 1: Initiate transaction
    POST /transactions
    {
      "offerId": "{offerId}",
      "finalPrice": 340000,
      "terms": "As agreed"
    }
    # Returns: { paymentIntent: { clientSecret, id } }

    # Step 2: Use Stripe SDK on frontend to process payment
    # (Client-side Stripe integration required)

    # Step 3: Confirm payment from backend
    POST /transactions/{transactionId}/confirm-payment
    {
      "paymentIntentId": "{paymentIntentId}"
    }
    ```

12. **Get Purchase Agreement**
    - PDF automatically generated
    - Stored in Cloudinary
    - Link provided in transaction response
    - Email sent with agreement

13. **Rate the Seller**

    ```bash
    POST /reviews/transaction/{transactionId}
    {
      "rating": 5,
      "comment": "Great seller, smooth process!"
    }
    ```

14. **View Transaction History**
    ```bash
    GET /transactions/my/purchases
    # All completed purchases
    ```

---

## 📊 Database Schema Summary

```
User (BUYER/SELLER)
├── Properties (if seller)
├── Connections (buyer interested in properties)
├── Messages (chat history)
├── Viewings (scheduled inspections)
├── Offers (purchase offers)
├── Transactions (completed purchases)
└── Reviews (post-purchase ratings)
```

---

## 🔐 Authentication

All endpoints except `/properties`, `/properties/search`, `/reviews/user/*` require:

```
Authorization: Bearer <JWT_TOKEN>
```

Get token from:

- `POST /auth/register` (returns token)
- `POST /auth/login` (returns token)

---

## 🧪 Testing the Flow (Manual)

1. **Create 2 test users** (one BUYER, one SELLER)
2. **As SELLER**: Create a property + upload images
3. **As BUYER**: Search, view property, express interest
4. **As SELLER**: Accept connection
5. **Both**: Exchange messages in `/messages`
6. **As BUYER**: Request viewing
7. **As SELLER**: Confirm viewing time
8. **As BUYER**: Make offer
9. **As SELLER**: Accept offer
10. **As BUYER**: Process payment via Stripe (TEST card: `4242 4242 4242 4242`)
11. **As BUYER**: Leave review
12. **Verify**: Transaction marked SOLD, emails sent, PDF generated

---

## 🛠️ Production Checklist

- [ ] Database migrated to production PostgreSQL
- [ ] All env vars set with LIVE API keys (not test)
- [ ] Stripe webhook configured: `<domain>/webhooks/stripe`
- [ ] Email templates reviewed
- [ ] SMS message limits set (avoid surprises)
- [ ] Cloudinary quota sufficient for images
- [ ] CORS/auth properly configured
- [ ] Rate limiting enabled
- [ ] Logging configured

---

## 📧 Email Notifications Sent Automatically

- ✅ New buyer interest notification
- ✅ Interest accepted notification
- ✅ Viewing request notification
- ✅ Viewing confirmed notification
- ✅ New offer notification
- ✅ Offer response notification
- ✅ Purchase completed notification
- ✅ Purchase agreement with PDF link

---

## 📱 SMS Notifications (if Twilio configured)

- ✅ New interest in property
- ✅ New offer received
- ✅ Viewing reminder (24h before)

---

## 🚨 Common Issues & Fixes

### "STRIPE_API_KEY not configured"

→ Add to `.env`: `STRIPE_API_KEY=sk_test_...`

### "Failed to send email"

→ Check SendGrid API key is valid
→ Verify `SENDGRID_FROM_EMAIL` is configured

### "Property image upload fails"

→ Verify Cloudinary credentials
→ Check: Cloud Name, API Key, API Secret

### "Database connection error"

→ Ensure PostgreSQL is running
→ Verify `DATABASE_URL` is correct

---

## 📚 API Endpoints Summary

**Properties**

- `GET /properties` — List all
- `GET /properties/search` — Search
- `GET /properties/:id` — Details
- `POST /properties` — Create (seller only)
- `PATCH /properties/:id` — Update (seller only)
- `POST /properties/:id/images` — Upload images
- `DELETE /properties/:id` — Delete (seller only)
- `PATCH /properties/:id/mark-sold` — Mark as sold

**Connections**

- `POST /connections` — Express interest
- `GET /connections/my-interests` — Buyer's interests
- `GET /connections/incoming` — Seller's incoming interests
- `PATCH /connections/:id/accept` — Accept interest
- `PATCH /connections/:id/reject` — Reject interest

**Messages**

- `POST /messages` — Send message
- `GET /messages/connection/:id` — Get conversation
- `GET /messages/unread/count` — Unread count

**Viewings**

- `POST /viewings` — Request viewing
- `GET /viewings/connection/:id` — Get viewings for connection
- `PATCH /viewings/:id/confirm` — Confirm time

**Offers**

- `POST /offers` — Make offer
- `GET /offers/:id` — Get offer details
- `GET /offers/connection/:id` — Get offers for connection
- `PATCH /offers/:id/respond` — Accept/reject/counter

**Transactions**

- `POST /transactions` — Initiate transaction (create Stripe payment intent)
- `POST /transactions/:id/confirm-payment` — Confirm payment & complete
- `GET /transactions/:id` — Get transaction
- `GET /transactions/my/purchases` — Buyer's transactions
- `GET /transactions/my/sales` — Seller's transactions

**Reviews**

- `POST /reviews/transaction/:id` — Leave review
- `GET /reviews/user/:id` — Get user's reviews
- `GET /reviews/user/:id/rating` — Get user's average rating

**Auth**

- `POST /auth/register` — Register
- `POST /auth/login` — Login
- `POST /auth/reset-password` — Reset password

---

## 🎉 You're Ready!

Copy API keys → Update `.env` → Run `npm run start:dev` → Visit Swagger docs → Start using!

**Next Steps (MVP 2):**

- WebSocket for real-time messaging
- Admin dashboard for moderation
- Advanced search filters
- Video tours
- Financing options
- Inspection reports
- Title insurance integration
- Tax/HOA details
