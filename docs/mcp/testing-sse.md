# Testing SSE (Server-Sent Events) for MCP Servers

This guide shows how to test SSE connections for MCP servers through the terminal, which is useful for debugging and validation.

## Basic SSE Connection Test

### Using curl

The most common way to test SSE endpoints:

```bash
# Basic SSE connection test
curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     http://localhost:3000/api/mcp

# With verbose output for debugging
curl -N -v -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     http://localhost:3000/api/mcp
```

### Key curl flags for SSE:

- `-N` or `--no-buffer`: Disable output buffering (essential for SSE)
- `-v`: Verbose output to see headers and connection details
- `-H "Accept: text/event-stream"`: Request SSE content type
- `-H "Cache-Control: no-cache"`: Prevent caching

## MCP-Specific SSE Testing

### 1. Test MCP Initialization

```bash
# Test MCP server initialization handshake
curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
     -H "Content-Type: application/json" \
     -X POST \
     http://localhost:3000/api/mcp
```

### 2. List Available Tools

```bash
# Get list of available MCP tools via SSE
curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
     -H "Content-Type: application/json" \
     -X POST \
     http://localhost:3000/api/mcp
```

### 3. Call a Specific Tool

```bash
# Test the event capacity calculator tool
curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{
       "jsonrpc": "2.0",
       "id": 3,
       "method": "tools/call",
       "params": {
         "name": "calculate_event_capacity",
         "arguments": {
           "guestCount": 100,
           "eventType": "wedding",
           "includeBuffer": true
         }
       }
     }' \
     -H "Content-Type: application/json" \
     -X POST \
     http://localhost:3000/api/mcp
```

## Advanced SSE Testing

### Using httpie (more user-friendly)

First install httpie: `brew install httpie` (macOS) or `pip install httpie`

```bash
# Basic SSE test with httpie
http --stream GET localhost:3000/api/mcp \
     Accept:text/event-stream \
     Cache-Control:no-cache

# POST request with JSON data
http --stream POST localhost:3000/api/mcp \
     Accept:text/event-stream \
     Content-Type:application/json \
     jsonrpc=2.0 \
     id:=1 \
     method=initialize \
     params:='{
       "protocolVersion": "2024-11-05",
       "capabilities": {"tools": {}},
       "clientInfo": {"name": "test-client", "version": "1.0.0"}
     }'
```

### Using websocat for persistent connections

Install websocat: `cargo install websocat` or download binary

```bash
# Connect to SSE endpoint and maintain connection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
websocat -v ws://localhost:3000/api/mcp
```

## Expected SSE Response Format

### Successful MCP Tool Response

```
data: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"🎉 **Evana Event Capacity Analysis**\n\n**Event Type:** Wedding\n**Guest Count:** 100\n**Recommended Venue Capacity:** 115 (includes 15% comfort buffer)\n\n**Space Breakdown:**\n• Dance Floor Capacity: 30 people\n• Cocktail/Reception Area: 80 people\n\n**Additional Considerations for wedding:**\n• Photo booth space\n• Gift table area\n• Bridal suite access\n\n**Evana Pro Tip:** Book a venue that can accommodate 115+ guests for optimal comfort and flow. Consider weather contingencies for outdoor events!"}]}}

```

### Error Response

```
data: {"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}

```

## Debugging SSE Issues

### Check Response Headers

```bash
# Examine response headers
curl -I -H "Accept: text/event-stream" \
     http://localhost:3000/api/mcp
```

Expected headers:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

### Monitor Network Traffic

```bash
# Use tcpdump to monitor SSE traffic
sudo tcpdump -i lo0 -A -s 0 port 3000

# Or use ngrep for HTTP-specific monitoring
ngrep -d any -W byline port 3000
```

## Testing Production SSE Endpoint

### Test deployed Vercel endpoint

```bash
# Test your deployed MCP server
curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     -H "Content-Type: application/json" \
     -X POST \
     https://your-evana-domain.vercel.app/api/mcp
```

### With timeout for long-running connections

```bash
# Add timeout to prevent hanging
timeout 30s curl -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     https://your-evana-domain.vercel.app/api/mcp
```

## Automated SSE Testing Script

### Create a test script

```bash
#!/bin/bash
# test-mcp-sse.sh

SERVER_URL="http://localhost:3000/api/mcp"
# SERVER_URL="https://your-domain.vercel.app/api/mcp"

echo "🧪 Testing MCP SSE Endpoint: $SERVER_URL"
echo "========================================"

# Test 1: Initialize MCP connection
echo "Test 1: MCP Initialize"
curl -s -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' \
     -H "Content-Type: application/json" \
     -X POST \
     $SERVER_URL | head -5

echo -e "\n\nTest 2: List Tools"
curl -s -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
     -H "Content-Type: application/json" \
     -X POST \
     $SERVER_URL | head -5

echo -e "\n\nTest 3: Call Event Capacity Tool"
curl -s -N -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculate_event_capacity","arguments":{"guestCount":50,"eventType":"birthday","includeBuffer":true}}}' \
     -H "Content-Type: application/json" \
     -X POST \
     $SERVER_URL | head -10

echo -e "\n\n✅ SSE tests completed!"
```

Make it executable and run:

```bash
chmod +x test-mcp-sse.sh
./test-mcp-sse.sh
```

## Common SSE Issues and Solutions

### 1. Connection Hanging

**Problem:** curl hangs without response
**Solution:** Add timeout or check server is running

```bash
timeout 10s curl -N -H "Accept: text/event-stream" http://localhost:3000/api/mcp
```

### 2. No SSE Headers

**Problem:** Server doesn't return `text/event-stream`
**Solution:** Verify MCP adapter configuration

### 3. CORS Issues

**Problem:** Browser blocks SSE connection
**Solution:** Check CORS headers in response

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Accept: text/event-stream" \
     -I http://localhost:3000/api/mcp
```

### 4. JSON Parsing Errors

**Problem:** Malformed JSON in SSE data
**Solution:** Validate JSON payload

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
```

## Monitoring SSE in Real-time

### Using tail for log monitoring

```bash
# If your app logs SSE events
tail -f logs/mcp-server.log | grep -E "(SSE|event-stream)"
```

### Using browser dev tools alternative

```bash
# Create a simple SSE listener
node -e "
const EventSource = require('eventsource');
const es = new EventSource('http://localhost:3000/api/mcp');
es.onmessage = (event) => console.log('Data:', event.data);
es.onerror = (error) => console.log('Error:', error);
"
```

This comprehensive guide should help you test and debug SSE connections for your MCP server effectively!
