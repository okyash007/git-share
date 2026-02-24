# GitShare

A platform to login with GitHub, view all your repositories, and share any of them with time-limited links.

## Project Structure

```
git-share/
├── backend/          # Express + MongoDB API server
│   ├── models/       # Mongoose schemas
│   ├── server.js     # Main server with OAuth & API routes
│   └── .env.example  # Environment config template
├── frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── pages/    # Landing, Dashboard, SharedView
│   │   ├── App.jsx   # Router setup
│   │   └── index.css # Design system
│   └── .env          # Frontend env config
└── README.md
```

## Setup

### 1. Create GitHub OAuth App

1. Go to [GitHub Settings → OAuth Apps](https://github.com/settings/applications/new)
2. Set **Homepage URL** to `http://localhost:5173`
3. Set **Authorization callback URL** to `http://localhost:3000/auth/github/callback`
4. Copy the Client ID and Client Secret

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your GitHub OAuth credentials and MongoDB URI
```

### 3. Start MongoDB

Make sure MongoDB is running on your machine (default: `mongodb://localhost:27017`)

### 4. Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

### 5. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the App

Navigate to `http://localhost:5173` in your browser.

## Features

- **GitHub OAuth Login** — Secure authentication via GitHub
- **Repository Browser** — View all your repos with search and filters
- **Time-Limited Sharing** — Generate shareable links (1h to 30d)
- **Auto-Expiration** — Links automatically expire via MongoDB TTL index
- **View Counter** — Track how many times your share was viewed
- **Share Management** — View, copy, and delete active share links
