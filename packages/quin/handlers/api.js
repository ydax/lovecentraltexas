const cors = require("cors");
const express = require("express");
const { genkit } = require("genkit");
const { googleAI } = require("@genkit-ai/google-genai");
const { initializeApp } = require("firebase-admin/app");
const { mcpServer } = require("genkitx-mcp");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");

/**
 * @purpose Express handler with MCP server for the Central Texas AI quin.
 * Provides SSE-based MCP endpoints for tool discovery and invocation.
 */

// Initialize Firebase (done once at module load)
initializeApp();

// Conditionally load firebase plugin if available
let firebasePlugin = null;
try {
  const firebaseModule = require("@genkit-ai/firebase");
  firebasePlugin =
    firebaseModule.firebase || firebaseModule.default || firebaseModule;
  if (typeof firebasePlugin !== "function") {
    firebasePlugin = null;
  }
} catch (error) {
  console.log(
    "[api] Firebase plugin not available, using Admin SDK only"
  );
}

const plugins = [googleAI({ apiKey: process.env.GEMINI_API_KEY })];

// Add firebase plugin if available
if (firebasePlugin) {
  plugins.push(firebasePlugin());
}

// Initialize Genkit
const ai = genkit({
  plugins,
  logLevel: "debug",
  enableTracingAndMetrics: true,
});

// Import and register tools
const { sayHello } = require("../tools/helloTools");
sayHello(ai); // Register the tool with the ai instance

// Create MCP server - it auto-discovers all registered tools
const mcp = mcpServer(ai, { name: "centraltexas-quin", version: "1.0.0" });

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Transport storage (per-instance)
let transport = null;

/**
 * @purpose SSE endpoint - establishes MCP connection.
 * AI agents connect here to discover available tools.
 */
app.get("/mcp/sse", (req, res) => {
  console.log("[api] MCP: Establishing SSE connection");
  transport = new SSEServerTransport("/mcp/messages", res);
  mcp.server.connect(transport);

  req.on("close", () => {
    console.log("[api] MCP: SSE connection closed");
    transport = null;
  });
});

/**
 * @purpose Messages endpoint - handles tool invocations.
 */
app.post("/mcp/messages", (req, res) => {
  console.log("[api] MCP: Received message");
  if (transport) {
    transport.handlePostMessage(req, res);
  } else {
    console.error("[api] MCP: No active transport");
    res.status(500).json({
      error: "No active SSE transport. Connect to /mcp/sse first.",
    });
  }
});

/**
 * @purpose Health check endpoint.
 */
app.get("/hello", (req, res) => {
  console.log("[api] Health check request");
  res.json({
    message: "Love Central Texas Quin is running",
    project: "lovecentraltexas",
    version: "1.0.0",
  });
});

/**
 * @purpose Root endpoint.
 */
app.get("/", (req, res) => {
  res.json({
    message: "Love Central Texas Quin",
    endpoints: {
      health: "GET /hello",
      mcp_sse: "GET /mcp/sse",
      mcp_messages: "POST /mcp/messages",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  console.log("[api] 404 Not Found:", { path: req.originalUrl });
  res.status(404).json({
    error: "Not Found",
    availableRoutes: [
      "GET /",
      "GET /hello",
      "GET /mcp/sse",
      "POST /mcp/messages",
    ],
  });
});

module.exports = app;

