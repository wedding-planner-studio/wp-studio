Get started with MCP
You can deploy your first MCP server to Vercel with a single file. Then, you can connect to the server through popular MCP hosts like Claude or Cursor.

Deploy an MCP server on Vercel
Use the @vercel/mcp-adapter package and create the following API route to host an MCP server that provides a single tool that rolls a dice.

app/api/mcp/route.ts

import { createMcpHandler } from '@vercel/mcp-adapter';

const handler = createMcpHandler((server) => {
server.tool(
'roll_dice',
'Rolls an N-sided die',
{ sides: z.number().int().min(2) },
async ({ sides }) => {
const value = 1 + Math.floor(Math.random() \* sides);
return { content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }] };
},
);
});

export { handler as GET, handler as POST, handler as DELETE };
When you deploy your application on Vercel, you will get a URL such as https://my-mcp-server.vercel.app.

Configure an MCP host
Using Cursor, add the URL of your MCP server to the configuration file in SSE transport format.

SSE Server

{
"mcpServers": {
"server-name": {
"url": "https://my-mcp-server.vercel.app/api/mcp"
}
}
}
You can now use your MCP roll dice tool in Cursor's AI chat or any other MCP client.

Deploy MCP servers efficiently on Vercel
By using Vercel to deploy your MCP server, you take advantage of Vercel Functions with Fluid compute to optimize your cost and usage. MCP servers often experience irregular usage patterns with a combination of long idle times, quick succession of messages and heavy AI workloads.

With Fluid compute's optimized concurrency and dynamic scaling, you only pay for the compute resources you actually use with the minimum amount of idle time. If your MCP server function needs to process AI heavy workloads, Fluid compute's ability to share instances increases performance efficiently.
