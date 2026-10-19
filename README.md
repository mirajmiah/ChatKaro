# ChatKaro

A production-ready, full-stack real-time chat application built with React 18, Node.js, MongoDB, and Socket.IO.

---

## Features

- Real-time messaging via Socket.IO with automatic reconnection
- Gmail SMTP email verification at signup; JWT authentication stored in HTTP-only cookies
- Image uploads (avatars + chat images) via Cloudinary
- Online presence — live online/offline user indicators
- Live contact/message request updates, notifications, and per-chat unread counts
- PDF and other supported document sharing via Cloudinary
- Installable mobile/desktop web app with a PWA manifest
- Responsive design — mobile sidebar/chat view switching + desktop split-pane
- Dark-first UI with 10 switchable DaisyUI themes
- Duplicate message prevention and stable socket listeners
- Rate limiting on authentication routes
- Production build served by the backend (single deployment)

---

## Tech Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Frontend  | React 18, Vite, Zustand, Axios, Socket.IO Client |
| Styling   | Tailwind CSS, DaisyUI                            |
| Routing   | React Router v6                                  |
| Backend   | Node.js (ESM), Express.js, Socket.IO             |
| Database  | MongoDB + Mongoose                               |
| Auth      | JWT + HTTP-only cookies, bcryptjs                |
| Media     | Cloudinary                                       |
| Dev Tools | Nodemon, Vite HMR                                |

---

## Project Structure

```
ChatKaro/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth + rate limit
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── lib/             # DB, Cloudinary, Socket.IO
│   │   └── index.js         # Entry point
│   ├── .env                 # Local environment variables (never commit)
│   ├── .env.example         # Safe placeholder template
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── pages/           # Route-level pages
    │   ├── store/           # Zustand state stores
    │   ├── lib/             # Axios instance, utilities
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── .env                 # Local environment variables (never commit)
    ├── .env.example         # Safe placeholder template
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- Node.js v18+  https://nodejs.org
- MongoDB Atlas account (free tier works)  https://cloud.mongodb.com
- Cloudinary account (free tier)  https://cloudinary.com

---

## Setup

### 1. Configure the Backend

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` with your own credentials. The committed `.env.example` contains placeholders only; never replace those placeholders with real credentials in the example file.

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database-name>
PORT=5001
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

**MongoDB Atlas:**
1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user (read/write access)
3. Whitelist your IP (or 0.0.0.0/0 for dev)
4. Copy the connection string and replace placeholders

**Cloudinary:**
1. Create a free account at https://cloudinary.com
2. From the Dashboard, copy Cloud Name, API Key, API Secret

**Google Gmail API (signup verification and password-reset codes):**
1. Enable the Gmail API in your Google Cloud Console.
2. In `backend/`, run `npm run get:gmail-token` to generate your `GMAIL_REFRESH_TOKEN`.
3. Set `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` in `backend/.env`.
4. This sends emails via Google HTTPS API (Port 443), working seamlessly on both localhost and cloud hosts like Render Free without port blocking.

New password-based accounts must verify their email with a six-digit code that expires after 10 minutes. Google sign-in accounts use Google’s verified email and do not need a second verification code. Legacy accounts remain verified.

Install dependencies:
```bash
npm install
```

### 2. Configure the Frontend

```bash
cd ../frontend
copy .env.example .env
```

For local development, Vite uses its local API proxy. Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` to enable Google sign-in. For production, set `VITE_API_URL` to the backend API base URL (including `/api`) and `VITE_SOCKET_URL` to the backend origin.

The Google client ID is included in the browser bundle and is not a client secret. Restrict its authorized origins in Google Cloud Console. Never put a Google client secret or any other secret in a `VITE_` variable.

### Keep credentials out of Git

- `.env` and `.env.*` files are ignored by Git; `.env.example` files are safe templates.
- Do not copy real credentials into `.env.example` or commit local `.env` files.
- Before pushing, check `git status` and confirm no `.env` files are staged.
- If a credential was ever committed or shared, revoke/rotate it; deleting the file in a later commit does not remove it from Git history.

Install dependencies:
```bash
npm install
```

---

## Running Locally

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Vite serves on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Production Deployment

### Build the frontend:
```bash
cd frontend
npm run build
```

### Start the production server:
```bash
cd backend
set NODE_ENV=production
npm start
# Serves API + React app on http://localhost:5001
```

Update backend `.env` for production:
```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

---

## API Reference

### Authentication

| Method | Endpoint                   | Auth Required | Description            |
|--------|----------------------------|---------------|------------------------|
| POST   | /api/auth/signup           | No            | Start registration and send email verification code |
| POST   | /api/auth/signup/verify-otp | No           | Verify signup code, finalize account details, and create login session |
| POST   | /api/auth/signup/resend-otp | No           | Send a replacement signup code |
| POST   | /api/auth/login            | No            | Login, get JWT cookie  |
| POST   | /api/auth/logout           | Yes           | Clear JWT cookie       |
| GET    | /api/auth/check            | Yes           | Verify auth, get user  |
| POST   | /api/auth/forgot-password  | No            | Request a password reset |
| POST   | /api/auth/reset-password/:token | No        | Set a new password and revoke old sessions |
| PUT    | /api/auth/update-name      | Yes           | Update display name   |
| PUT    | /api/auth/update-profile   | Yes           | Update profile picture |

**Signup body:**
```json
{ "fullName": "Ada Lovelace", "email": "ada@example.com", "password": "secret123" }
```

**Update profile body:**
```json
{ "profilePic": "data:image/jpeg;base64,..." }
```

### Messages

| Method | Endpoint                    | Auth Required | Description              |
|--------|-----------------------------|---------------|--------------------------|
| GET    | /api/messages/users         | Yes           | List all other users     |
| GET    | /api/messages/:userId       | Yes           | Get conversation history |
| PATCH  | /api/messages/:userId/read  | Yes           | Mark incoming conversation messages as read |
| POST   | /api/messages/send/:userId  | Yes           | Send a message           |

**Send message body (at least one field required):**
```json
{ "text": "Hello!", "image": "data:image/jpeg;base64,..." }
```

---

## Socket.IO Events

| Event        | Direction        | Payload            | Description                    |
|--------------|------------------|--------------------|--------------------------------|
| onlineUsers  | Server -> All    | string[] (userIds) | Broadcast when presence changes|
| newMessage   | Server -> Client | Message object     | Real-time message delivery     |

---

## Database Models

**User**
```
fullName   String   required, max 80 chars
email      String   required, unique, lowercase
password   String   bcrypt hashed (never returned in API)
profilePic String   Cloudinary URL
lastSeen   Date
createdAt  Date     auto
updatedAt  Date     auto
```

**Message**
```
senderId   ObjectId  ref: User
receiverId ObjectId  ref: User
text       String    max 2000 chars, optional
image      String    Cloudinary URL, optional
read       Boolean   default false
createdAt  Date      auto
updatedAt  Date      auto
```

---

## Security Measures

- Passwords hashed with bcrypt (salt rounds: 12)
- JWT in HTTP-only, SameSite=strict cookies
- Secure cookies enabled in production
- CORS restricted to configured FRONTEND_URL
- Auth routes rate-limited (15 req / 15 min per IP)
- Message length capped at 2000 characters
- Image/video uploads: max 5 MB client + server side
- Document uploads: max 10 MB client + server side; PDFs can be previewed and documents downloaded through authenticated links
- Passwords excluded from all API responses
- Signup and password-reset OTPs are hashed and expire after 10 minutes
- Password resets invalidate existing JWT sessions
- All secrets in .env (never committed)

---

## Testing Checklist

- [ ] Register two accounts in different browsers
- [ ] Log out and log back in — session persists after refresh
- [ ] Try duplicate email — see error toast
- [ ] Try wrong password — see generic error (no account enumeration)
- [ ] Navigate to / while logged out — redirect to /login
- [ ] Send text message — appears instantly in both browsers
- [ ] Send image — uploads to Cloudinary, shows inline
- [ ] Open app in two browsers — online dot appears/disappears
- [ ] Disconnect network briefly — socket reconnects automatically
- [ ] Resize to mobile — sidebar and chat panel switch views
- [ ] Upload profile picture — avatar updates immediately
- [ ] Switch themes on Settings page — applied instantly
- [ ] npm run build in frontend — no errors
- [ ] Start backend with NODE_ENV=production — serves built app

---

## License

MIT
