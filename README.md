# DUSTER

> **Personal + Team Workspace • Tasks • Content • Polls • Chat**  
> Built as an open-source-friendly alternative with a terminal/command-line aesthetic, local-first MongoDB storage, and real-time collaboration.

---

## 1. Fixed Tech Stack & Architecture

- **Frontend**:
  - React (Create React App SPA)
  - Plain JavaScript only (no TypeScript / no TSX)
  - HTML & CSS with custom CSS design tokens (`tokens.css`, `terminal.css`, `globals.css`)
  - React Router v6
  - Material UI (MUI) & Lucide icons
  - Socket.IO client (`socket.io-client`)
  - Canvas Confetti (`canvas-confetti`)
- **Backend**:
  - Node.js & Express.js (JavaScript)
  - MongoDB via Mongoose (with seamless automated in-memory fallback for instant local dev)
  - Dual Authentication: Google Identity Services (ID Token backend verification) + Passwordless Email OTP + JWT access token & secure HttpOnly refresh cookie session
  - Socket.IO real-time WebSocket server
  - Multer for local filesystem file uploads (abstracted for S3/object storage migration)

---

## 2. Quick Start & Local Run

### Prerequisites
- Node.js (v18+) and npm installed.

### Option A: Running Backend & Frontend

#### Terminal 1 — Start the Server:
```bash
cd server
npm start
```
*Runs on `http://localhost:5000`*.  
*Note: If no local standalone MongoDB server is running on port 27017, the server will automatically start an in-memory MongoDB instance so you can develop immediately with zero configuration!*

#### Terminal 2 — Start the Client:
```bash
cd client
npm start
```
*Opens in browser at `http://localhost:3000`*.

---

## 3. Running Automated Tests

A complete 15-suite integration test covering all modules can be run via:
```bash
cd server
node -e "require('./server.js'); require('./test_api.js');"
```
Or from root:
```bash
npm run test:server
```

---

## 4. Authentication Setup

### A. Passwordless Email Sign-In (Instant / Out of the Box)
1. On the sign-in screen, enter any email (e.g. `alex@company.com`).
2. Click **[ Send verification code ]**.
3. In development mode, the 6-digit code is printed directly to the server terminal console and pre-filled in the UI for instant testing.
4. Click **[ Verify & Enter Workspace ]**. A default personal workspace is automatically provisioned.

### B. Google Sign-In Setup (Optional)
To enable Google Identity Services:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Under **APIs & Services > Credentials**, create an **OAuth 2.0 Client ID** (Web application).
3. Add Authorized JavaScript Origin: `http://localhost:3000`.
4. Copy your Client ID:
   - In `client/.env`: set `REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here`
   - In `server/.env`: set `GOOGLE_CLIENT_ID=your_client_id_here`
5. Restart the server and client.

---

## 5. Modules & Features

| Module | Features |
|---|---|
| **Dashboard** | Open & Shipped metric counters, Today checklist, circular Weekly Progress indicator, Deadlines (Overdue / Upcoming), In Progress list, Recently Shipped, Focus Areas tag bars. |
| **Tasks** | 5 distinct views: **Board** (Kanban), **Table**, **Calendar**, **Timeline**, **List**. Full CRUD, priority badges (`P0`–`P4`), status transitions, celebration confetti & toast (`✦ Shipped ✦ nice work`). |
| **Content** | Shared knowledge repository: nested folders, file uploads (PDF, Word, Excel, images, text), authenticated download/stream, in-app modal preview for PDFs and images. |
| **Polls** | Single-choice and multiple-choice questions, vote tallies, active and closed states with terminal progress bars, real-time vote updates via Socket.IO. |
| **Chat** | Real-time 1-on-1 Direct Messaging + Workspace-wide Group Chat (`#workspace-general`) with typing indicators, presence, and MongoDB message persistence. |
| **Activity** | Unified workspace timeline tracking task, content, poll, member, and invitation events with type filters. |
| **Analytics** | At-a-glance KPIs, Completion over time chart, Status breakdown bar chart, Priority mix donut chart, Deadlines, and Tag clusters. |
| **Settings** | Profile editing, theme switching (Terminal / Dark / Light), Collaborator management, Data backup (JSON export, Sample tasks loader), Danger zone (Clear all tasks). |
| **Invitations** | Admin & Member role invitations with 7-day secure tokens, 1-click shareable link generation, and `/invite/:token` landing view. |
