const { initializeApp } = require("firebase-admin/app");
const { onRequest } = require("firebase-functions/v2/https");

/**
 * @purpose Initialize Firebase Admin SDK once at module load.
 */
initializeApp();

/**
 * @purpose Import the Express app with MCP server.
 */
const app = require("./handlers/api");

/**
 * @purpose Main agent API endpoint with MCP server.
 * Deployed as a Cloud Function with Node.js 20 runtime.
 */
exports.agent = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 60,
  },
  app
);

