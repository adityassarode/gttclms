# GTTC Library Management System

Full-stack Library Management System with a premium UI inspired by the provided design, built with React + Spring Boot.

## Project Structure

- `frontend/` React + Vite UI
- `backend/` Spring Boot + JPA API

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

Backend runs on `http://localhost:8080` (H2 in-memory by default).

### Optional MySQL

Create a database and run with:

```bash
cd backend
SPRING_PROFILES_ACTIVE=prod MYSQL_URL=jdbc:mysql://localhost:3306/gttc_lms MYSQL_USERNAME=root MYSQL_PASSWORD=your_password mvn spring-boot:run
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

To point the frontend at a different backend URL:

```bash
export VITE_API_URL=http://localhost:8080
```

## Admin Login

- Username: `Aditya Sarode`
- Password: `Aditya@1234`

## Google Sign-In

For production Google sign-in, set a client ID:

```bash
export VITE_GOOGLE_CLIENT_ID=your_google_client_id
export APP_GOOGLE_CLIENT_ID=your_google_client_id
```

If not configured, the login page provides a demo Google sign-in button.

## Email Notifications

Emails are logged to the backend console by default (`APP_MAIL_MODE=console`).
To send real emails, configure SMTP and set `APP_MAIL_MODE=smtp`.
