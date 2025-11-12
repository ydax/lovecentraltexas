# Love Central Texas

A yarn workspace monorepo containing a NextJS React app and Quin (a Genkit/MCP AI agent), both deployed on Firebase.

## Project Information

- **Project Name:** Love Central Texas
- **Project ID:** lovecentraltexas
- **Project Number:** 956360338882

## Repository Structure

- `packages/app` - NextJS React application with Material UI v4
- `packages/quin` - Quin AI agent (Genkit/MCP server) deployed as Firebase Cloud Functions v2

## Prerequisites

- Node.js 20+
- Yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (for CI/CD)

## Getting Started

### Initial Setup

1. Install dependencies:

```bash
yarn install
```

2. Set up environment variables:

```bash
# For the app
cp packages/app/.env.local.example packages/app/.env.local
# Edit packages/app/.env.local with your Firebase config

# For quin
cp packages/quin/.env.example packages/quin/.env
# Edit packages/quin/.env with your GEMINI_API_KEY
```

3. Login to Firebase:

```bash
firebase login
```

### Development

Run the NextJS app locally:

```bash
yarn app:dev
```

Serve quin functions locally:

```bash
yarn quin:serve
```

### Building

Build the NextJS app:

```bash
yarn app:build
```

Build quin functions:

```bash
yarn quin:build
```

### Deployment

Deploy everything:

```bash
yarn deploy
```

Deploy specific services:

```bash
yarn deploy:app      # Deploy hosting only
yarn deploy:quin      # Deploy functions only
yarn deploy:firestore # Deploy Firestore rules and indexes
```

## Firebase Services

- **Authentication:** Email-based passwordless authentication
- **Firestore:** NoSQL database
- **Hosting:** NextJS app hosting
- **Cloud Functions:** Quin AI agent (Genkit/MCP server, Node.js 20)

## CI/CD

Deployments are automated via Google Cloud Build. A Cloud Build trigger watches for changes to `packages/quin/**` on the `master` branch and automatically builds and deploys Quin when changes are detected.

**What the CI/CD pipeline does:**

1. Installs all dependencies
2. Builds the quin workspace
3. Deploys Quin as a Firebase Cloud Function
4. Uses `GEMINI_API_KEY` from Google Secret Manager

**Configuration:**

- Build configuration: `cloudbuild.yaml`
- Trigger: Watches `packages/quin/**` on `master` branch
- Secret: `GEMINI_API_KEY` stored in Secret Manager

**View build status:**

```bash
# List recent builds
gcloud builds list --project=lovecentraltexas --limit=5

# View specific build logs
gcloud builds log <BUILD_ID> --region=us-central1 --project=lovecentraltexas
```

## Architecture

### App (packages/app)

- NextJS 14 with React 18
- Material UI v4
- Firebase client SDK
- Passwordless email authentication

### Quin (packages/quin)

Quin is the AI agent that exposes tools via the Model Context Protocol (MCP). It enables AI agents to discover and invoke tools that interact with Love Central Texas services and data.

**Key Components:**

- Firebase Cloud Functions v2 (Node.js 20 runtime)
- Genkit AI framework for tool definition and management
- MCP (Model Context Protocol) server for AI agent communication
- Express.js with Server-Sent Events (SSE) transport
- Google Gemini AI integration via Genkit

**Architecture:**

- `index.js` - Cloud Function entry point, exports `quin` function
- `handlers/api.js` - Express app with MCP server setup and route handlers
- `tools/` - Directory containing Genkit tool definitions (e.g., `helloTools.js`)

**How It Works:**

1. Tools are defined using Genkit's `ai.defineTool()` method with Zod schemas
2. Tools are registered in `handlers/api.js` with the Genkit AI instance
3. MCP server automatically discovers all registered tools
4. AI agents connect via `GET /mcp/sse` to discover available tools
5. Agents invoke tools via `POST /mcp/messages` with tool name and parameters
6. Tools execute and return results via MCP protocol

**For detailed information about working with Quin, see:** [`packages/quin/README.md`](packages/quin/README.md)

## Coding Guidelines

- Use CommonJS (`require`/`module.exports`)
- Material UI v4 only (no `gap` or `sx` properties)
- Alphabetize imports and component properties
- Use structured logging with function names in brackets
- Follow single responsibility principle for functions
