const { onRequest } = require("firebase-functions/v2/https");

/**
 * @purpose Import the Express app with MCP server.
 * Firebase Admin SDK is initialized by the Genkit Firebase plugin in handlers/api.js.
 */
const app = require("./handlers/api");

/**
 * @purpose Main quin API endpoint with MCP server.
 * Deployed as a Cloud Function with Node.js 20 runtime.
 */
exports.quin = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 60,
  },
  app
);
