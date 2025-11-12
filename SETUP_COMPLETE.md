# Central Texas - Setup Complete! 🎉

## Repository Structure Created

```
centraltexas/
├── Root Configuration
│   ├── package.json                 ✅ Yarn workspace config
│   ├── .gitignore                   ✅ Git ignore patterns
│   ├── README.md                    ✅ Project documentation
│   ├── firebase.json                ✅ Firebase config
│   ├── firestore.rules              ✅ Security rules
│   ├── firestore.indexes.json       ✅ Database indexes
│   ├── iam_policy.yaml              ✅ IAM permissions
│   ├── cloudbuild.yaml              ✅ CI/CD pipeline
│   └── .gcloudignore                ✅ Build ignore patterns
│
├── packages/app/                    ✅ NextJS Application
│   ├── package.json
│   ├── next.config.js
│   ├── lib/
│   │   └── firebase.js              ✅ Firebase client setup
│   ├── pages/
│   │   ├── _app.js                  ✅ Material UI theme
│   │   ├── _document.js             ✅ SSR support
│   │   └── index.js                 ✅ Passwordless auth page
│   └── public/
│       └── favicon.svg              ✅ Icon
│
└── packages/quin/                   ✅ Genkit/MCP Quin
    ├── package.json
    ├── index.js                     ✅ Cloud Function entry
    ├── handlers/
    │   └── api.js                   ✅ Express + MCP server
    └── tools/
        └── helloTools.js            ✅ sayHello tool
```

## Next Steps

### 1. Install Dependencies

```bash
cd /Users/pdavisjones/Repos/centraltexas
yarn install
```

### 2. Configure Environment Variables

**For the App (packages/app/.env.local):**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lovecentraltexas.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lovecentraltexas
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lovecentraltexas.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=956360338882
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id-here
```

**For Quin (packages/quin/.env):**
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Enable Firebase Authentication

In the Firebase Console (https://console.firebase.google.com/project/lovecentraltexas):
- Go to Authentication → Sign-in method
- Enable "Email/Password" provider
- Enable "Email link (passwordless sign-in)"

### 4. Test Locally

**Run the App:**
```bash
yarn app:dev
# Opens at http://localhost:3000
```

**Test Quin:**
```bash
cd packages/quin
firebase emulators:start --only functions
# Quin available at http://localhost:5001/lovecentraltexas/us-central1/quin
```

### 5. Deploy to Firebase

**Deploy Everything:**
```bash
firebase login
yarn deploy
```

**Or deploy individually:**
```bash
yarn deploy:app         # Deploy hosting
yarn deploy:quin        # Deploy functions
yarn deploy:firestore   # Deploy Firestore rules
```

### 6. Set Up CI/CD

1. Connect your repository to Google Cloud Build
2. Create a build trigger for your main branch
3. Add the `GEMINI_API_KEY` secret to Secret Manager:
   ```bash
   echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY \
     --data-file=- \
     --project=lovecentraltexas
   ```

## What's Included

### App Features
- ✅ NextJS 14 with static export
- ✅ Material UI v4 (no gap/sx properties)
- ✅ Firebase passwordless email authentication
- ✅ Alphabetized imports and properties
- ✅ Hello world page with user info display

### Quin Features
- ✅ Firebase Cloud Functions v2 (Node.js 20)
- ✅ Genkit AI framework
- ✅ MCP server with SSE transport
- ✅ Express.js routing
- ✅ Hello world tool (sayHello)
- ✅ Structured logging with function names

### Infrastructure
- ✅ Firestore with authenticated user rules
- ✅ Firebase Hosting configuration
- ✅ Google Cloud Build CI/CD pipeline
- ✅ IAM policy management
- ✅ Yarn workspace monorepo

## Testing the Quin MCP Server

Once deployed, quin will be available at:
```
https://us-central1-lovecentraltexas.cloudfunctions.net/quin
```

**Endpoints:**
- `GET /hello` - Health check
- `GET /mcp/sse` - MCP connection endpoint
- `POST /mcp/messages` - MCP message handler

**Available Tools:**
- `sayHello` - Returns a greeting with the provided name

## Project Info
- **Project Name:** Love Central Texas
- **Project ID:** lovecentraltexas
- **Project Number:** 956360338882
- **Region:** us-central1 (default)

## Architecture Notes

- All server-side code uses CommonJS (require/module.exports)
- Material UI v4 only (compatible with React 18)
- Structured logging with function names in brackets
- Single responsibility principle for all functions
- Alphabetized imports and component properties throughout

Happy coding! 🚀

