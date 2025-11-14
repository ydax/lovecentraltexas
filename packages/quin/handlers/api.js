const cors = require("cors");
const express = require("express");
const { genkit } = require("genkit");
const { googleAI } = require("@genkit-ai/google-genai");
const { getApps, initializeApp } = require("firebase-admin/app");
const { mcpServer } = require("genkitx-mcp");

/**
 * @purpose Express handler with MCP server for Quin (Love Central Texas AI agent).
 * Provides SSE-based MCP endpoints for tool discovery and invocation.
 */

// Initialize Firebase Admin SDK if not already initialized.
if (!getApps().length) {
  initializeApp();
  console.log("[api] Firebase Admin SDK initialized");
}

// Lazy initialization of Genkit and MCP server
// This prevents errors during Firebase deployment analysis when GEMINI_API_KEY isn't available yet
let ai = null;
let mcp = null;

/**
 * @purpose Initialize Genkit and MCP server on first use.
 * This deferred initialization prevents deployment failures when environment variables aren't set.
 */
function initializeGenkitIfNeeded() {
  if (ai) return; // Already initialized

  console.log("[api] Initializing Genkit with Google Gemini");

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
    console.log("[api] Firebase plugin not available, using Admin SDK only");
  }

  const plugins = [googleAI({ apiKey: process.env.GEMINI_API_KEY })];

  // Add firebase plugin if available
  if (firebasePlugin) {
    plugins.push(firebasePlugin());
  }

  // Initialize Genkit
  ai = genkit({
    plugins,
    logLevel: "debug",
    enableTracingAndMetrics: true,
  });

  // Import and register tools
  const { sayHello } = require("../tools/helloTools");
  sayHello(ai); // Register the tool with the ai instance

  // Create MCP server - it auto-discovers all registered tools
  mcp = mcpServer(ai, { name: "centraltexas-quin", version: "1.0.0" });

  console.log("[api] Genkit and MCP server initialized successfully");
}

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
app.get("/mcp/sse", async (req, res) => {
  console.log("[api] MCP: Establishing SSE connection");
  try {
    initializeGenkitIfNeeded(); // Initialize on first request

    // Dynamic import for ES module
    const { SSEServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/sse.js"
    );
    transport = new SSEServerTransport("/mcp/messages", res);
    mcp.server.connect(transport);

    req.on("close", () => {
      console.log("[api] MCP: SSE connection closed");
      transport = null;
    });
  } catch (error) {
    console.error("[api] MCP: Error establishing SSE connection:", error);
    res.status(500).json({ error: "Failed to establish SSE connection" });
  }
});

/**
 * @purpose Messages endpoint - handles tool invocations.
 */
app.post("/mcp/messages", (req, res) => {
  console.log("[api] MCP: Received message");
  initializeGenkitIfNeeded(); // Ensure initialized

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
