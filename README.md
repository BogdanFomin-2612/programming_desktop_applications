# Classoom Hub 🏫

A desktop laboratory management application for teachers.  
Built with **Electron + Node.js** (frontend), **Python FastAPI** (backend), **MongoDB Atlas** (database).

## Features
- 📊 **Dashboard** — Live attendance stats, GPA trends, critical alerts
- 👥 **Roster** — Add, edit, delete students; cycle attendance status (Present → Late → Absent)
- 📝 **Grades** — Record grades per student/subject, filter, auto-calculate GPA
- 💻 **Code Review** — Submit student code, add feedback and scores
- 🌙 **Dark / Light mode** toggle

## Setup

### 1. Configure MongoDB Atlas

Copy the `.env.example` file:
```bash
cd api
copy .env.example .env
```

Edit `api/.env` and paste your **MongoDB Atlas connection string**:
```
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/...
DB_NAME=homeroom_hub
```

### 2. Install Python dependencies

```bash
cd api
pip install -r requirements.txt
```

### 3. Start the Python API server

```bash
cd api
python -m uvicorn main:app --port 8000 --reload
```

The server will seed sample data on first run.

### 4. Install and launch the Electron app

In a new terminal:
```bash
cd electron
npm install
npm start
```

## Running both at once (recommended)

Open **two terminals**:

**Terminal 1** — API:
```bash
cd api && python -m uvicorn main:app --port 8000 --reload
```

**Terminal 2** — App:
```bash
cd electron && npm start
```

## Project Structure

```
├── api/                    # Python FastAPI backend
│   ├── main.py             # All REST endpoints
│   ├── models.py           # Pydantic schemas
│   ├── database.py         # MongoDB (motor) connection
│   ├── requirements.txt
│   └── .env                # Your MongoDB Atlas URL (create this!)
└── electron/               # Electron desktop app
    ├── main.js             # Main process (starts Python, opens window)
    ├── preload.js
    ├── package.json
    └── renderer/           # UI
        ├── index.html
        ├── style.css
        └── app.js
```
