# TRD — Technical Requirements Document

## Frontend
- React 19 (Create React App)
- Tailwind CSS (via PostCSS)
- Socket.io client for real-time WebSocket updates
- Axios for REST API calls
- React Router for client-side routing
- React Testing Library + Jest for unit/component tests

## Backend
- Node.js + Express 5
- Socket.io (Server) for WebSocket broadcasting
- Mongoose for MongoDB ODM
- JWT (jsonwebtoken) for authentication token generation/verification
- bcryptjs for password hashing
- Axios for calling the ML Flask API
- Winston + winston-daily-rotate-file for structured logging
- Nodemailer for email alerts
- Twilio SDK for SMS alerts
- Jest + Supertest for integration tests

## Database
- MongoDB Atlas (cloud-hosted)
- Collections: reactors (TTL 7 days), alerts, users, plants
- TTL index on reactor readings: `expireAfterSeconds: 604800`
- Compound index on reactor readings: `reactor_id + timestamp`

## Authentication
- JWT stored in localStorage on the frontend
- Role-based access: `admin` and `operator`
- Passwords hashed with bcrypt via `User.pre('save')` hook
- `seedDefaultUsers()` seeds admin/admin123 and operator/op123 on first startup if users collection is empty
- Protected routes check JWT on every API request

## Hosting
- Render (backend + ML model as web services)
- Frontend: Vercel or Render static site
- MongoDB: MongoDB Atlas free/shared tier
- Docker + docker-compose for local development

## Third-party APIs & Services
- **Twilio** — SMS alert delivery to operator and admin phone numbers
- **Nodemailer** — email alerts via Gmail (app password required)
- **MongoDB Atlas** — managed cloud database
- **GitHub Actions** — CI/CD (ci.yml + deploy.yml)
- **Render** — production deployment via deploy hook

## Key Libraries
**Backend:**
- express ^5.2.1
- mongoose ^9.6.2
- socket.io ^4.8.3
- jsonwebtoken ^9.0.3
- bcryptjs ^3.0.3
- axios ^1.16.0
- nodemailer ^8.0.7
- twilio ^6.0.2
- winston ^3.17.0
- winston-daily-rotate-file ^5.0.0
- jest ^29.7.0
- supertest ^7.0.0

**ML Model (Python):**
- Flask
- scikit-learn (RandomForestClassifier)
- tensorflow/keras (LSTM)
- pandas, numpy
- joblib (model persistence)

**Frontend:**
- react ^19
- socket.io-client
- axios
- tailwindcss
- @testing-library/react

## Environment Variables
**backend/.env:**
- `MONGO_URI` — MongoDB Atlas connection string
- `PORT` — backend port (default 5000)
- `JWT_SECRET` — secret for signing JWTs
- `EMAIL_USER` — Gmail address for Nodemailer
- `EMAIL_PASS` — Gmail app password
- `TWILIO_ACCOUNT_SID` — Twilio account SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_PHONE` — Twilio sender phone number
- `ALERT_PHONE` — primary alert recipient phone
- `OPERATOR_PHONE` — operator phone number
- `ADMIN_PHONE` — admin phone number
- `ML_URL` — URL of Flask ML API (default http://localhost:5001)

**frontend/.env:**
- `REACT_APP_API_URL` — backend API base URL

## Constraints
- ML Flask API must run on port 5001; backend on 5000; frontend on 3000
- Backend uses CommonJS (`require`/`module.exports`) — never ESM
- Frontend uses ES modules (`import/export`) — never require()
- ML ensemble formula is fixed: `risk_score = RF_score × 0.40 + LSTM_score × 0.60`
- Status thresholds: < 30 SAFE, 30–69 WARNING, ≥ 70 CRITICAL
- Git LFS required for *.h5, *.pkl, *.npy model files
- CI must pass all 3 suites before Render deploy hook fires
