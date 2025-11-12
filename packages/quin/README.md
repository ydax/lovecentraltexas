# Quin - Love Central Texas AI Agent

Quin is a Firebase Cloud Function that exposes AI tools via the Model Context Protocol (MCP). It enables AI agents to discover and invoke tools that interact with Love Central Texas services and data.

## Quick Start for LLM Developers

**If you're an LLM working with this codebase, here's what you need to know:**

1. **Entry Point**: `index.js` - This is where the Cloud Function is exported. It initializes Firebase Admin SDK and exports the `quin` function that wraps the Express app.

2. **Main Logic**: `handlers/api.js` - This file:

   - Initializes Genkit with Google Gemini plugin
   - Registers all tools with the Genkit AI instance
   - Creates the MCP server
   - Sets up Express routes (`/`, `/hello`, `/mcp/sse`, `/mcp/messages`)

3. **Tool Definitions**: `tools/*.js` - Each file in this directory exports one or more Genkit tools. Tools are functions that AI agents can call.

4. **To Add a New Tool**:

   - Create a file in `tools/` (e.g., `tools/myTool.js`)
   - Export a function that takes `ai` as parameter and calls `ai.defineTool()`
   - Import and register it in `handlers/api.js` (see example with `sayHello`)

5. **Code Style**:

   - CommonJS only (`require`/`module.exports`, no ES6 imports)
   - Structured logging: `console.log("[functionName] Message", { data })`
   - Alphabetize imports and object properties
   - Use Zod for input/output schemas

6. **Testing**: Run `yarn serve` to start Firebase emulators locally.

## Architecture Overview

Quin is built on:

- **Firebase Cloud Functions v2** - Serverless function runtime (Node.js 20)
- **Genkit** - Google's AI framework for tool definition and management
- **MCP (Model Context Protocol)** - Standard protocol for AI agent tool discovery
- **Express.js** - HTTP server for MCP endpoints
- **Google Gemini** - AI model backend (via Genkit)

## Project Structure

```
packages/quin/
├── index.js              # Cloud Function entry point, exports `quin` function
│                         # - Initializes Firebase Admin SDK
│                         # - Imports Express app from handlers/api.js
│                         # - Exports Cloud Function named "quin"
│
├── handlers/
│   └── api.js            # Express app with MCP server setup
│                         # - Initializes Genkit with plugins
│                         # - Registers all tools (import from tools/)
│                         # - Creates MCP server instance
│                         # - Defines Express routes
│
├── tools/
│   └── helloTools.js     # Example tool implementation
│                         # - Exports sayHello tool
│                         # - Shows pattern for creating new tools
│
├── package.json          # Dependencies and scripts
├── README.md             # This file - comprehensive documentation
└── .env.example          # Environment variable template
```

**File Responsibilities:**

- `index.js`: Cloud Function wrapper, Firebase Admin initialization
- `handlers/api.js`: Core application logic, tool registration, MCP server, Express routes
- `tools/*.js`: Individual tool definitions (business logic)
- `package.json`: Dependencies, scripts, Node.js version

## Code Flow and Execution Path

**Understanding how Quin works end-to-end:**

1. **Deployment**: When deployed, Firebase calls `exports.quin` from `index.js`
2. **Initialization**: `index.js` initializes Firebase Admin SDK and imports the Express app from `handlers/api.js`
3. **App Setup**: `handlers/api.js` runs at module load:
   - Initializes Genkit with Google Gemini plugin
   - Imports and registers all tools (currently just `sayHello`)
   - Creates MCP server instance (auto-discovers registered tools)
   - Sets up Express middleware (CORS, JSON parsing)
   - Defines routes
4. **Request Handling**:
   - Health check: `GET /hello` → Returns JSON status
   - MCP connection: `GET /mcp/sse` → Establishes SSE connection, creates transport
   - Tool invocation: `POST /mcp/messages` → MCP server routes to appropriate tool → Tool executes → Returns result via MCP protocol

**Key Files and Their Roles:**

- `index.js`: Entry point, minimal logic (just wrapper)
- `handlers/api.js`: All application setup and routing logic
- `tools/*.js`: Business logic for individual tools

## Key Concepts for LLM Developers

### 1. Tools Are the Core Building Blocks

**What is a tool?** A tool is a callable function that an AI agent can discover and invoke. Tools are defined using Genkit's `ai.defineTool()` method.

**Tool Structure:**

- **Name**: Unique identifier (e.g., `sayHello`)
- **Description**: Human-readable explanation of what the tool does (used by AI agents to decide when to call it)
- **Input Schema**: Zod schema defining required parameters
- **Output Schema**: Zod schema defining return value structure
- **Implementation**: Async function that executes the tool's logic

### 2. How Tools Are Registered

Tools are registered in `handlers/api.js`:

```javascript
// Import tool definition
const { sayHello } = require("../tools/helloTools");

// Register with Genkit AI instance
sayHello(ai);
```

The MCP server automatically discovers all registered tools and exposes them to AI agents.

### 3. MCP Protocol Flow

1. **AI Agent connects** → `GET /mcp/sse` (Server-Sent Events connection)
2. **Agent discovers tools** → MCP server lists all registered tools
3. **Agent invokes tool** → `POST /mcp/messages` (with tool name and parameters)
4. **Tool executes** → Genkit runs the tool function
5. **Result returned** → Via MCP message back to agent

## Adding a New Tool

### Step 1: Create Tool File

Create a new file in `tools/` directory (e.g., `tools/myNewTool.js`):

```javascript
const { z } = require("zod");

/**
 * @purpose Brief description of what this tool does.
 */

/**
 * @purpose Detailed description of the tool's purpose and behavior.
 */
const myNewTool = (ai) =>
  ai.defineTool(
    {
      name: "myNewTool",
      description:
        "Clear, concise description that helps AI agents understand when to use this tool",

      inputSchema: z.object({
        // Define input parameters using Zod
        param1: z.string().describe("Description of param1"),
        param2: z.number().optional().describe("Optional parameter"),
      }),

      outputSchema: z.object({
        // Define return value structure
        result: z.string().describe("What the tool returns"),
        success: z.boolean().describe("Whether operation succeeded"),
      }),
    },

    // Implementation function
    async (input) => {
      // Use structured logging with function name in brackets
      console.log("[myNewTool] Starting execution", { param1: input.param1 });

      try {
        // Tool logic here
        const result = await performOperation(input.param1);

        console.log("[myNewTool] Operation completed successfully");

        return {
          result: result,
          success: true,
        };
      } catch (error) {
        console.error("[myNewTool] Error:", error);
        throw error; // Genkit will handle error reporting to agent
      }
    }
  );

module.exports = { myNewTool };
```

### Step 2: Register Tool in handlers/api.js

Add the import and registration:

```javascript
// At the top with other imports
const { myNewTool } = require("../tools/myNewTool");

// After Genkit initialization, register the tool
myNewTool(ai);
```

### Step 3: Test Locally

```bash
cd packages/quin
yarn serve
# Test endpoint: http://localhost:5001/lovecentraltexas/us-central1/quin
```

## Code Patterns and Conventions

### Structured Logging

Always use function names in brackets for log messages:

```javascript
console.log("[functionName] Action description", { context: data });
console.error("[functionName] Error occurred:", error);
```

### Error Handling

Tools should throw errors for Genkit to handle:

```javascript
async (input) => {
  try {
    // operation
  } catch (error) {
    console.error("[toolName] Error:", error);
    throw error; // Let Genkit handle error reporting
  }
};
```

### Zod Schema Best Practices

- Always provide `.describe()` for each field
- Use `.optional()` for optional parameters
- Use appropriate Zod types (`z.string()`, `z.number()`, `z.boolean()`, `z.array()`, etc.)
- Nest objects for complex structures

### Alphabetization

- Alphabetize imports at the top of files
- Alphabetize object properties in component configurations

## Environment Variables

Required environment variable (set in Firebase Functions config or `.env` for local):

- `GEMINI_API_KEY` - Google Gemini API key for Genkit AI operations

**Note:** For Cloud Build deployments, `GEMINI_API_KEY` must be stored in Google Secret Manager. The Secret Manager API must be enabled in the project.

## Local Development

### Prerequisites

- Node.js 20+
- Yarn
- Firebase CLI
- GEMINI_API_KEY

### Setup

```bash
# Install dependencies
cd packages/quin
yarn install

# Set up environment variables
# Create .env file with:
# GEMINI_API_KEY=your-key-here
```

### Run Locally

```bash
# Start Firebase emulators
yarn serve

# Quin will be available at:
# http://localhost:5001/lovecentraltexas/us-central1/quin
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5001/lovecentraltexas/us-central1/quin/hello

# Root endpoint (lists available endpoints)
curl http://localhost:5001/lovecentraltexas/us-central1/quin/
```

## Deployment

### Manual Deployment

```bash
cd packages/quin
yarn deploy
```

### CI/CD Deployment

Quin is automatically deployed via Google Cloud Build when changes are pushed to `packages/quin/**` on the `master` branch.

**Build Configuration:** See `cloudbuild.yaml` in the repository root.

**Trigger:** Cloud Build trigger watches `packages/quin/**` for changes.

## Production Endpoints

Once deployed, Quin is available at:

```
https://us-central1-lovecentraltexas.cloudfunctions.net/quin
```

**Available Endpoints:**

- `GET /` - Root endpoint, lists available routes
- `GET /hello` - Health check
- `GET /mcp/sse` - MCP Server-Sent Events connection (for AI agents)
- `POST /mcp/messages` - MCP message handler (for tool invocations)

## Common Tasks for LLM Developers

### Task: Add a New Tool

1. Create `tools/newToolName.js` following the pattern in `helloTools.js`
2. Import and register in `handlers/api.js`
3. Test locally with `yarn serve`
4. Commit and push - CI/CD will deploy automatically

### Task: Modify Existing Tool

1. Edit the tool file in `tools/`
2. Update input/output schemas if needed
3. Test locally
4. Commit and push

### Task: Debug Tool Issues

1. Check logs: `gcloud functions logs read quin --project=lovecentraltexas`
2. Test locally first: `yarn serve`
3. Use structured logging: `console.log("[toolName] Debug info", { data })`

### Task: Update Dependencies

1. Edit `package.json`
2. Run `yarn install`
3. Test locally
4. Commit and push (CI/CD will rebuild)

## Tool Design Guidelines

### Good Tool Descriptions

✅ **Good**: "Retrieves user profile information from Firestore by user ID"
✅ **Good**: "Sends an email notification to a user with the specified template"

❌ **Bad**: "Gets user data"
❌ **Bad**: "Does stuff with users"

### Tool Naming

- Use camelCase: `getUserProfile`, `sendEmailNotification`
- Be descriptive: `getUserProfile` not `getUser` or `fetch`
- Use verbs: `create`, `update`, `delete`, `get`, `send`, etc.

### Input/Output Design

- **Keep inputs minimal**: Only require what's necessary
- **Use optional parameters**: For non-essential inputs
- **Return structured data**: Always return objects with clear fields
- **Include metadata**: Timestamps, success flags, error details when helpful

## Integration with Other Services

Quin can integrate with:

- **Firestore** - Via Firebase Admin SDK (already initialized)
- **Firebase Storage** - Via Firebase Admin SDK
- **External APIs** - Via HTTP requests (use `fetch` or `axios`)
- **Cloud Tasks** - For async operations
- **Other Cloud Functions** - Via HTTP calls

## Testing MCP Connection

To test MCP endpoints programmatically:

```javascript
// Connect to SSE endpoint
const eventSource = new EventSource(
  "https://us-central1-lovecentraltexas.cloudfunctions.net/quin/mcp/sse"
);

eventSource.onmessage = (event) => {
  console.log("MCP message:", event.data);
};

// Send tool invocation
fetch(
  "https://us-central1-lovecentraltexas.cloudfunctions.net/quin/mcp/messages",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // MCP message format
    }),
  }
);
```

## Troubleshooting

### Tool Not Appearing in MCP Discovery

- Check tool is registered in `handlers/api.js`
- Verify tool exports correctly: `module.exports = { toolName }`
- Check Genkit initialization completed successfully
- Review logs for registration errors

### Tool Execution Fails

- Check structured logs: `[toolName]` prefix
- Verify input schema matches what agent is sending
- Ensure error handling throws errors (don't swallow them)
- Check Firebase Admin SDK initialization if using Firestore

### Deployment Issues

- Verify `cloudbuild.yaml` is correct
- Check Cloud Build logs: `gcloud builds list --project=lovecentraltexas`
- Ensure `GEMINI_API_KEY` secret exists in Secret Manager
- Verify Cloud Build service account has necessary permissions

## Related Documentation

- **Genkit Documentation**: https://genkit.dev
- **MCP Specification**: https://modelcontextprotocol.io
- **Firebase Functions v2**: https://firebase.google.com/docs/functions
- **Zod Schema Validation**: https://zod.dev

## Project Information

- **Project ID**: `lovecentraltexas`
- **Project Number**: `956360338882`
- **Region**: `us-central1`
- **Runtime**: Node.js 20
- **Memory**: 1GiB
- **Timeout**: 60 seconds
# Test trigger - fixing IAM permissions
