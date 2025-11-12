# Love Central Texas

A yarn workspace monorepo containing a NextJS React app and a Genkit/MCP AI quin, both deployed on Firebase.

## Project Information

- **Project Name:** Love Central Texas
- **Project ID:** lovecentraltexas
- **Project Number:** 956360338882

## Repository Structure

- `packages/app` - NextJS React application with Material UI v4
- `packages/quin` - Genkit/MCP server deployed as Firebase Cloud Functions v2

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
- **Cloud Functions:** Genkit/MCP quin (Node.js 20)

## CI/CD

Deployments are automated via Google Cloud Build. See `cloudbuild.yaml` for configuration.

## Architecture

### App (packages/app)

- NextJS 14 with React 18
- Material UI v4
- Firebase client SDK
- Passwordless email authentication

### Quin (packages/quin)

- Firebase Cloud Functions v2
- Genkit AI framework
- MCP (Model Context Protocol) server
- Express.js with SSE transport
- Google Gemini AI integration

## Coding Guidelines

- Use CommonJS (`require`/`module.exports`)
- Material UI v4 only (no `gap` or `sx` properties)
- Alphabetize imports and component properties
- Use structured logging with function names in brackets
- Follow single responsibility principle for functions
