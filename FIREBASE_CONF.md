Here is the complete, end-to-end implementation to migrate your local database, restructure your codebase, deploy to Firebase, and connect your domain.

1. **Migrate Homelab Database to the Cloud:**
Create a free PostgreSQL database on a provider like Neon or Supabase. You can pipe your local homelab database directly into your new cloud database using `pg_dump` and `pg_restore`.

Run this in your local terminal:

```bash
pg_dump -Fc -v -d "postgresql://local_user:password@localhost:5432/local_db" | pg_restore -v -d "postgresql://cloud_user:password@cloud-host.neon.tech/cloud_db"

```


2. **Initialize Firebase Workspace:**
Run this at the root of your project directory to set up the Firebase configuration.

```bash
npm install -g firebase-tools
firebase login
firebase init functions hosting

```

* **Functions:** Select JavaScript or TypeScript.
* **Hosting:** Enter your React build folder name (e.g., `build` or `dist`). Configure it as a single-page app (rewrites all urls to `/index.html`).


3. **Set the Cloud Database Environment Variable:**
Firebase Functions automatically detects variables from a `.env` file. Create one inside the new `functions` directory.

**functions/.env**

```env
DATABASE_URL="postgresql://cloud_user:password@cloud-host.neon.tech/cloud_db"

```


4. **Adapt the Node API for Firebase:**
Move your Express backend logic into the `functions` directory. You must install your backend dependencies (`express`, `pg`, etc.) inside the `functions` folder. Export the app as a single HTTPS function.

**functions/index.js**

```javascript
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// SSL is required for managed cloud databases like Neon/Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// Example route - add the rest of your API routes here
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Export the Express app under the name "api"
exports.api = onRequest(app);

```


5. **Configure the Proxy Rewrites:**
Update the Firebase configuration at the root of your project to map frontend API calls to your backend function, which bypasses CORS issues.

**firebase.json**

```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ]
}

```


6. **Build and Deploy the Full Stack:**
Compile your React UI, then deploy both the frontend and backend to Firebase simultaneously.

```bash
# Compile the React frontend (run from your React directory)
npm run build

# Deploy everything at once (run from your project root)
firebase deploy

```


7. **Connect Your Custom Domain:**
Once the deployment succeeds, connect your domain to the hosted application.

1. Open the **Firebase Console**.
2. Navigate to **Hosting** in the left sidebar.
3. Click **Add custom domain**.
4. Enter your domain name.
5. Firebase will provide you with **A** and **TXT** records.
6. Log into your domain registrar (e.g., GoDaddy, Namecheap) and add those records to your DNS settings.

SSL certificates will automatically generate and apply once the DNS changes propagate.