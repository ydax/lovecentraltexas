const { z } = require("zod");

/**
 * @purpose Define hello world Genkit tool for testing.
 * This module exports a tool definition that can be registered with the Genkit AI instance.
 */

/**
 * @purpose Simple hello world tool that returns a greeting.
 */
const sayHello = (ai) =>
  ai.defineTool(
    {
      name: "sayHello",
      description: "Returns a friendly greeting with the provided name",

      // Define expected input using Zod
      inputSchema: z.object({
        name: z.string().describe("Name of the person to greet"),
      }),

      // Define expected output using Zod
      outputSchema: z.object({
        greeting: z.string().describe("The greeting message"),
        timestamp: z.number().describe("Unix timestamp when greeting was generated"),
      }),
    },

    // The async function implementing the tool's logic
    async (input) => {
      console.log("[sayHello] Generating greeting for:", { name: input.name });
      
      const greeting = `Hello, ${input.name}! Welcome to Love Central Texas.`;
      const timestamp = Math.floor(Date.now() / 1000);

      console.log("[sayHello] Greeting generated successfully");
      
      return {
        greeting,
        timestamp,
      };
    }
  );

module.exports = { sayHello };

