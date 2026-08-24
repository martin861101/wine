Mission: Audit and Fix Production Deployment

You are working on an existing application that is currently not configured correctly in production.

The intended production architecture is:

Internet
   │
   ▼
Xneelo
Frontend / UI
   │
   │ HTTPS API requests
   ▼
Supabase
Backend / Edge Functions / Auth
   │
   ▼
Supabase PostgreSQL

The frontend/UI is hosted on Xneelo.

The backend, authentication, database, server-side logic, and secrets must run through Supabase.

Your task is to perform a complete configuration audit, identify what is incorrect, and implement the necessary fixes.

CRITICAL RULES

Do not blindly rewrite working code.

Before making changes:

1. Inspect the entire repository.
2. Understand the current frontend/backend architecture.
3. Locate all environment-variable usage.
4. Locate all API clients and API base URLs.
5. Locate authentication implementation.
6. Locate database implementation.
7. Locate Supabase configuration.
8. Locate backend routes/functions.
9. Determine what currently runs locally versus what is expected to run in production.
10. Produce a short audit summary before making architectural changes.

Preserve working functionality wherever possible.

Never expose server secrets to the browser.

---

1. Inspect Repository Structure

Determine which directories contain:

frontend
backend
API routes
Supabase
Edge Functions
database migrations
authentication
configuration
deployment scripts

Specifically search for:

package.json
vite.config.*
src/
server/
backend/
api/
supabase/
supabase/functions/
supabase/migrations/
.env
.env.example
.env.production

Also inspect all "package.json" scripts.

Determine exactly how the application currently starts locally.

---

2. Determine Current Backend Architecture

The previous backend configuration included values similar to:

NODE_ENV=development
PORT=4010
SUPABASE_DB_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

This suggests the project may originally have contained a standalone Node backend.

Determine whether the current backend is:

Express
Fastify
Node HTTP
Supabase Edge Functions
or another framework

Do NOT assume a Node server can run directly as a Supabase Edge Function.

If the existing backend is Node/Express, identify:

- routes
- middleware
- authentication
- database access
- file handling
- scheduled jobs
- third-party integrations
- Node-specific dependencies

Then determine what must be migrated/adapted to Supabase Edge Functions.

Do not destroy the existing backend during migration.

---

3. Audit Frontend Environment Variables

Search for all frontend environment variables, especially:

VITE_*
process.env.*
import.meta.env.*
localhost
127.0.0.1
:4010
/api

There must be no production frontend request pointing to:

localhost
127.0.0.1
localhost:4010

Create a clear production configuration.

For example:

VITE_API_URL=https://<production-backend>
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-key>

Use the actual variable naming convention already established by the project where possible.

---

4. SECURITY AUDIT

Search the complete frontend source and build configuration for:

DATABASE_URL
SUPABASE_DB_URL
POSTGRES_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SUPABASE_SERVICE_ROLE_KEY
SERVICE_ROLE
PRIVATE_KEY
API_SECRET

These must NEVER be bundled into the Xneelo frontend.

Classify environment variables into:

PUBLIC / FRONTEND SAFE
SERVER ONLY

Frontend-safe Supabase credentials may include the project's public/publishable/anon credentials where appropriate.

Server-only secrets must remain exclusively in Supabase/server-side configuration.

If secrets have accidentally been committed or bundled into the frontend, report them clearly.

Do not print their complete values.

Recommend rotation for any secret that appears to have been exposed.

---

5. Audit Supabase Configuration

Inspect:

supabase/config.toml
supabase/functions/
supabase/migrations/

Determine:

- which Edge Functions exist
- which backend routes have been migrated
- which routes are still missing
- whether authentication is Supabase Auth or custom JWT
- whether migrations exist
- whether required tables exist
- whether RLS policies exist
- whether functions expect environment variables
- whether CORS is configured

Create a mapping such as:

Frontend action
      ↓
Frontend API function
      ↓
Expected endpoint
      ↓
Supabase Edge Function
      ↓
Database/Auth operation

Find broken links in this chain.

---

6. Backend Secrets

Server-side values must be configured through Supabase secrets/environment configuration rather than the Xneelo frontend.

Determine which existing environment variables are required by Edge Functions.

Examples may include:

SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

third-party API credentials
email credentials
webhook secrets

Do not invent values.

If a required value cannot be determined, document it as:

REQUIRED MANUAL VALUE

Provide the exact Supabase CLI command needed to configure it, but never insert fake production credentials.

---

7. Database Audit

Determine how the backend connects to PostgreSQL.

Check for:

pg
postgres
Prisma
Drizzle
Knex
Supabase JS
raw SQL

If Edge Functions are being used, determine whether direct Postgres access is actually required or whether "supabase-js" should be used.

Verify that all expected migrations are represented in:

supabase/migrations/

Do not drop or recreate production tables.

Never run destructive migrations automatically.

Flag destructive changes for manual approval.

---

8. Authentication Audit

Determine whether the application currently uses:

Supabase Auth
custom JWT
cookies
localStorage tokens
Authorization: Bearer
refresh tokens

Trace login from beginning to end:

Login form
   ↓
frontend auth service
   ↓
backend/Supabase
   ↓
authentication
   ↓
session/token
   ↓
frontend session
   ↓
authenticated API request

Identify any mismatch between the old Node authentication architecture and the new Supabase architecture.

Do not maintain two competing authentication systems unless there is a clear technical requirement.

---

9. CORS

The production backend must accept requests from the Xneelo-hosted application.

Determine the actual production domain from existing project configuration.

Support both versions where applicable:

https://domain.co.za
https://www.domain.co.za

Do not use:

Access-Control-Allow-Origin: *

for authenticated production endpoints unless there is a deliberate and justified reason.

Create a reusable CORS implementation for Supabase functions.

Support:

OPTIONS
Authorization
Content-Type
apikey

where required.

---

10. Create Health Endpoint

Ensure there is a simple production health endpoint.

For example:

GET /health

or:

/functions/v1/health

It should return something similar to:

{
  "status": "ok",
  "service": "backend"
}

Optionally verify database connectivity without exposing database information.

Never expose:

connection strings
passwords
internal hostnames
service-role keys
stack traces

---

11. Centralize Frontend API Configuration

There should be one canonical API configuration rather than URLs scattered throughout components.

Prefer an architecture similar to:

src/
  lib/
    api.ts
    supabase.ts

or use the project's existing equivalent.

Components should not contain hardcoded backend URLs.

For example:

const API_URL = import.meta.env.VITE_API_URL;

Validate required production variables at startup where appropriate.

---

12. Xneelo Production Build

Determine the correct build process.

Likely:

npm install
npm run build

Verify the production output directory, usually:

dist/

The Xneelo web root should contain the contents of the production build rather than the development source tree.

If this is a React SPA, verify ".htaccess" supports client-side routing.

Example behaviour required:

/requested/react/route
        ↓
index.html
        ↓
React Router

Do not interfere with real files or assets.

---

13. Xneelo ".htaccess"

Inspect the existing ".htaccess".

Ensure:

- SPA fallback works
- HTTPS works correctly
- static assets aren't rewritten incorrectly
- API traffic isn't accidentally being routed to Xneelo
- security headers don't break the application

Do not proxy "/api" to "localhost".

The browser should communicate directly with the production Supabase backend unless the project deliberately implements another gateway.

---

14. Production Logging

Improve error handling enough that production failures can be diagnosed.

Frontend errors should identify failures such as:

NETWORK_ERROR
AUTH_ERROR
API_ERROR
CONFIG_ERROR

Backend logs may contain technical details but must never expose secrets to clients.

Do not return raw database errors or stack traces to production users.

---

15. Create Deployment Documentation

Create/update:

DEPLOYMENT.md

Document:

Architecture

Xneelo
   │
   │ frontend
   ▼
Browser
   │
   │ HTTPS
   ▼
Supabase Edge Functions
   │
   ├── Auth
   │
   └── PostgreSQL

Include:

- prerequisites
- environment variables
- Supabase project setup
- Supabase CLI login/linking
- secrets configuration
- migration deployment
- Edge Function deployment
- frontend build
- Xneelo upload
- ".htaccess"
- CORS
- health check
- production testing
- rollback considerations

Never place actual secrets in documentation.

---

16. Create Environment Templates

Create/update:

.env.example

Separate frontend and backend variables clearly.

For example:

# =========================
# FRONTEND — SAFE FOR BUILD
# =========================

VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# =========================
# SERVER ONLY
# NEVER ADD TO VITE VARIABLES
# =========================

SUPABASE_SERVICE_ROLE_KEY=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

Adapt this to what the application actually uses.

---

17. Remove Development Dependencies From Production Paths

Search for:

localhost
127.0.0.1
4010
development URLs
temporary API endpoints
mock authentication
mock databases

Development configuration may remain available locally.

Production must never depend on the developer's machine.

---

18. Test the Complete Production Flow

Verify, where tooling/access permits:

Xneelo frontend loads
        ↓
Supabase reachable
        ↓
health endpoint succeeds
        ↓
registration/login succeeds
        ↓
session established
        ↓
authenticated endpoint succeeds
        ↓
database read succeeds
        ↓
database write succeeds
        ↓
logout succeeds

Also test:

page refresh
direct React route
expired authentication
invalid credentials
backend unavailable
CORS preflight
mobile-sized browser

---

19. Do Not Hide Problems

If the existing architecture is incompatible with Supabase Edge Functions, explicitly say so.

Do not create hacks simply to make deployment appear successful.

For example, if there is a large Express backend that requires a persistent Node runtime, report:

CURRENT:
Xneelo → Express backend → Supabase PostgreSQL

REQUESTED:
Xneelo → Supabase Edge Functions → Supabase PostgreSQL

MIGRATION REQUIRED:
Express routes must be converted to Edge Functions.

Then migrate them systematically.

---

20. Final Deliverable

When complete, provide a concise report containing:

PRODUCTION AUDIT

Frontend:
PASS / FIXED / ACTION REQUIRED

Supabase:
PASS / FIXED / ACTION REQUIRED

Database:
PASS / FIXED / ACTION REQUIRED

Authentication:
PASS / FIXED / ACTION REQUIRED

Edge Functions:
PASS / FIXED / ACTION REQUIRED

Environment Variables:
PASS / FIXED / ACTION REQUIRED

CORS:
PASS / FIXED / ACTION REQUIRED

Xneelo:
PASS / FIXED / ACTION REQUIRED

Security:
PASS / FIXED / ACTION REQUIRED

Then provide:

Changes Made

Every important file changed and why.

Supabase Commands

Exact commands I need to execute, in order.

Xneelo Deployment

Exactly what needs to be uploaded/replaced.

Required Manual Configuration

Anything you cannot configure from the repository.

Production Test

Exact URLs/actions I should test and the expected result.

PRIMARY OBJECTIVE

At the end, there must be one clean production architecture:

             XNEELO
        ┌──────────────┐
        │ React / Vite │
        │     UI       │
        └──────┬───────┘
               │
               │ HTTPS
               ▼
          SUPABASE
   ┌──────────────────────┐
   │ Edge Functions / API │
   │         │            │
   │         ├── Auth     │
   │         │            │
   │         ▼            │
   │     PostgreSQL       │
   └──────────────────────┘

No production dependency on "localhost".

No database credentials in Xneelo.

No service-role keys in frontend JavaScript.

No backend JWT secrets in Vite variables.

No duplicated backend architecture unless technically required.

Do not consider the job complete merely because the application builds. The complete Xneelo → Supabase → database/auth production request path must be validated.
