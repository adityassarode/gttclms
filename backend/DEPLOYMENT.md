# Backend Deployment (Azure App Service)

## Service settings

- Runtime: Java
- Root directory: backend
- Build command: mvn clean package -DskipTests
- Start command: java -jar target/gttc-lms-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
- Health check path: /health

CI/CD deployment is configured via the GitHub Actions workflow in .github/workflows/main_gttclms.yml.

## Required environment variables

- SUPABASE_ISSUER_URI
- SPRING_DATASOURCE_URL
- SPRING_DATASOURCE_USERNAME
- SPRING_DATASOURCE_PASSWORD
- APP_FRONTEND_URLS

## Resend variables (recommended for production)

- APP_RESEND_API_KEY
- APP_MAIL_FROM=onboarding@resend.dev (or a verified sender domain)
- APP_MAIL_MODE=resend

## Supabase connectivity

- JWT verification: SUPABASE_ISSUER_URI must point to your Supabase auth issuer.
- Database: use Supabase Postgres JDBC credentials in SPRING*DATASOURCE*\* vars.
- CORS: APP_FRONTEND_URLS must include your active frontend domain(s) such as Vercel or Netlify.

## Local + production env template

- backend/.env.example
