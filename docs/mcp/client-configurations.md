# MCP Client Configurations for WP Studio

This document provides step-by-step instructions for connecting various MCP clients to the WP Studio MCP server.

## Server Endpoint

Once deployed, your WP Studio MCP server will be available at:

```
https://your-wpstudio-domain.vercel.app/api/mcp
```

## Cursor IDE Configuration

### Method 1: Settings UI (Recommended)

1. Open Cursor
2. Go to **Settings** → **Features** → **Model Context Protocol**
3. Click **Add Server**
4. Enter:
   - **Name**: `wpstudio`
   - **URL**: `https://your-wpstudio-domain.vercel.app/api/mcp`
5. Click **Save**

### Method 2: Configuration File

Create or edit your MCP configuration file:

**Location:**

- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp-manager/config.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp-manager\config.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp-manager/config.json`

**Content:**

```json
{
  "mcpServers": {
    "wpstudio": {
      "url": "https://your-wpstudio-domain.vercel.app/api/mcp"
    }
  }
}
```

## Claude Desktop Configuration

### Step 1: Locate Configuration File

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Step 2: Add Server Configuration

```json
{
  "mcpServers": {
    "wpstudio": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://your-wpstudio-domain.vercel.app/api/mcp"
      ]
    }
  }
}
```

### Step 3: Restart Claude Desktop

## Continue.dev Configuration

Add to your Continue configuration file (`.continue/config.json`):

```json
{
  "mcpServers": [
    {
      "name": "wpstudio",
      "serverUrl": "https://your-wpstudio-domain.vercel.app/api/mcp"
    }
  ]
}
```

## Testing the Connection

### Using Cursor

1. Open a new chat in Cursor
2. Type: "Calculate event capacity for 100 guests at a wedding"
3. The AI should use the WP Studio MCP tools to provide detailed capacity analysis

### Using Claude Desktop

1. Start a new conversation
2. Ask: "Help me analyze RSVP trends for 150 invited guests, 90 responses, 14 days until event"
3. Claude should use the WP Studio RSVP analysis tool

### Expected Tool Responses

When working correctly, you should see responses like:

```
🎉 **WP Studio Event Capacity Analysis**

**Event Type:** Wedding
**Guest Count:** 100
**Recommended Venue Capacity:** 115 (includes 15% comfort buffer)

**Space Breakdown:**
• Dance Floor Capacity: 30 people
• Cocktail/Reception Area: 80 people

**Additional Considerations for wedding:**
• Photo booth space
• Gift table area
• Bridal suite access

**WP Studio Pro Tip:** Book a venue that can accommodate 115+ guests for optimal comfort and flow. Consider weather contingencies for outdoor events!
```

## Troubleshooting

### Common Issues

1. **"Server not responding"**

   - Verify your domain URL is correct
   - Check if your Vercel deployment is live
   - Ensure the MCP route is deployed (`/api/mcp`)

2. **"No tools available"**

   - Restart your MCP client after configuration
   - Verify the JSON configuration syntax
   - Check client logs for connection errors

3. **"Authentication failed"**
   - WP Studio MCP server doesn't require authentication
   - Remove any auth-related configurations

### Testing Server Directly

You can test if your MCP server is working by making a direct HTTP request:

```bash
curl -X POST https://your-wpstudio-domain.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

Expected response should include the three WP Studio tools:

- `calculate_event_capacity`
- `analyze_rsvp_trends`
- `calculate_catering_portions`

## Local Development

For local testing, use `http://localhost:3000/api/mcp` as your server URL and start your Next.js development server:

```bash
npm run dev
```

## Security Considerations

- The WP Studio MCP server is read-only (no database modifications)
- All calculations are performed in-memory
- No sensitive data is stored or transmitted
- Rate limiting is handled by Vercel Functions

## Advanced Configuration

### Custom Headers (if needed)

Some MCP clients support custom headers:

```json
{
  "mcpServers": {
    "wpstudio": {
      "url": "https://your-wpstudio-domain.vercel.app/api/mcp",
      "headers": {
        "User-Agent": "MyClient/1.0"
      }
    }
  }
}
```

### Timeout Configuration

```json
{
  "mcpServers": {
    "wpstudio": {
      "url": "https://your-wpstudio-domain.vercel.app/api/mcp",
      "timeout": 30000
    }
  }
}
```
