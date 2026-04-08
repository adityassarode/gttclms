# Backend Deployment (Azure App Service)

## Service settings

- Runtime: Java
- Root directory: backend
- Build command: mvn clean package -DskipTests
- Start command (recommended for GitHub jar deploy): java -jar /home/site/wwwroot/gttc-lms-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
- Health check path: /health

Note:

- If you deploy source and build on App Service, `target/gttc-lms-0.0.1-SNAPSHOT.jar` can be valid.
- If you deploy a jar artifact (GitHub Action `azure/webapps-deploy`), use `/home/site/wwwroot/gttc-lms-0.0.1-SNAPSHOT.jar`.

CI/CD deployment is configured via the GitHub Actions workflow in .github/workflows/main_gttclms.yml.

## Required environment variables

- SUPABASE_ISSUER_URI
- APP_SUPABASE_ALLOWED_ISSUERS (optional, comma-separated)
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
- Multi-project support (optional): APP_SUPABASE_ALLOWED_ISSUERS can list additional trusted Supabase issuers.
  Example: https://project-a.supabase.co/auth/v1,https://project-b.supabase.co/auth/v1
- Database: use Supabase Postgres JDBC credentials in SPRING*DATASOURCE*\* vars.
- CORS: APP_FRONTEND_URLS must include your active frontend domain(s) such as Vercel or Netlify.

## Critical frontend/backend alignment

- Vercel frontend env must use the same Supabase project as Azure backend JWT verification.
- Frontend vars:
  - NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key for same project>
- Azure backend vars:
  - SUPABASE_ISSUER_URI=https://<project-ref>.supabase.co/auth/v1
  - APP_FRONTEND_URLS=https://gttclms.vercel.app (and any additional active frontend domains)

If project refs differ between frontend and backend, authenticated requests return 401.

## Local + production env template

- backend/.env.example
