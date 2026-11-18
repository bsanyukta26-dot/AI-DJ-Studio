# 🎧 AI DJ Studio

### Collaborative Live Queue Curation & Sentiment-Aware Audio Engine

## 📌 Project Overview

AI DJ Studio is a collaborative music platform that allows users to create private music lounges, invite listeners, collaboratively manage music queues, and participate in real-time DJ battles.

The platform combines collaborative music curation, real-time communication, acoustic track analysis, and competitive DJ interactions to create an engaging music-listening experience.

## ✨ Key Features

- **User Authentication:** User registration and secure JWT-based login.
- **Private Music Lounges:** Create private lounges and invite members using invitation codes.
- **Collaborative Queue Management:** Add tracks, view the queue, and participate in queue voting.
- **Real-Time Communication:** Live chat, member presence, and queue synchronization using WebSockets.
- **Acoustic Track Profiling:** Track information includes BPM, Camelot key, energy, and valence.
- **Music Matching:** Basic music matching and recommendation functionality using track characteristics.
- **Mood and Sentiment:** Basic lounge mood and sentiment-related functionality.
- **Soundclash DJ Battles:** DJs can compete by submitting tracks for a battle.
- **Listener Voting:** Lounge members can vote for their preferred DJ submission.
- **Automatic Winner Determination:** Battle results are determined using listener votes.
- **Queue Integration:** The winning track is automatically added to the lounge queue.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL (Neon), SQLAlchemy |
| Authentication | JWT |
| Real-Time Communication | WebSockets |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |
| Version Control | Git and GitHub |

## 🏗️ System Architecture

The application follows a frontend-backend architecture.

```text
              USERS
                |
                v
       React.js Frontend
            (Netlify)
                |
                | HTTP API / WebSocket
                v
        FastAPI Backend
             (Render)
                |
                v
        SQLAlchemy ORM
                |
                v
       PostgreSQL Database
              (Neon)
```

- The React frontend provides the user interface.
- The FastAPI backend handles authentication, lounge management, queue operations, battles, and real-time functionality.
- SQLAlchemy manages database interactions.
- PostgreSQL stores application data.
- WebSockets support real-time communication.

## 🚀 Live Deployment

The application is deployed and accessible online.

| Service | Link |
|---|---|
| Live Frontend | https://ai-dj-studio.netlify.app |
| Backend API | https://ai-dj-studio-backend.onrender.com |
| GitHub Repository | https://github.com/bsanyukta26-dot/AI-DJ-Studio |

## 💻 Local Installation and Setup

Follow these steps to run AI DJ Studio locally.

### Prerequisites

- Python
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/bsanyukta26-dot/AI-DJ-Studio.git
cd AI-DJ-Studio
```

### 2. Backend Setup

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Configure the required backend environment variables:

```text
SECRET_KEY=your_private_secret_key
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
```

For local development, configure the database connection according to the backend database settings. Never commit private credentials or secret keys.

Start the backend server:

```bash
python -m uvicorn app.main:app --reload
```

Backend address:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend environment variable:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Open the local application at:

```text
http://localhost:3000
```

**Note:** The local frontend and backend must both be running for the application to work correctly. Use the deployed backend URL instead of localhost when configuring a separately deployed frontend.

## 🔐 Environment Variables

The application uses environment variables to configure deployment and protect sensitive information.

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Secret key used for JWT authentication |
| `DATABASE_URL` | Database connection string |
| `FRONTEND_ORIGINS` | Allowed frontend origins for CORS |
| `VITE_API_BASE_URL` | Backend API URL used by the frontend |

**Security Note:** Never upload `.env` files, database credentials, JWT secret keys, or other private information to GitHub.

## 🧪 Testing and Verification

The following application functionality has been tested:

- User registration and login.
- Private lounge creation and joining using invitation codes.
- Collaborative queue operations and voting.
- Real-time chat and synchronization.
- Soundclash battle creation.
- DJ track submissions.
- Listener voting.
- Battle completion and winner determination.
- Automatic updates across multiple browser sessions.
- Winning-track integration into the lounge queue.

## 📂 Project Repository Structure

```text
AI-DJ-Studio/
│
├── app/
│   ├── main.py
│   ├── database.py
│   ├── schemas.py
│   ├── security.py
│   ├── queue_manager.py
│   └── model/    
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── requirements.txt
├── .gitignore
└── README.md
```


## 👩‍💻 Author

**Sanyukta Bhattacharya**

Project: AI DJ Studio

GitHub: https://github.com/bsanyukta26-dot/AI-DJ-Studio

---

**AI DJ Studio — Bringing collaborative music experiences to life.**