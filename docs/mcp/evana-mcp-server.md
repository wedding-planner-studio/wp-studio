# Evana MCP Server

This document describes the Model Context Protocol (MCP) server implementation for Evana, providing AI assistants with access to event planning tools and calculations.

## Overview

The Evana MCP server exposes three powerful tools for event planning:

1. **Event Capacity Calculator** - Calculates optimal venue capacity based on guest count and event type
2. **RSVP Trend Analyzer** - Provides insights on RSVP patterns and response rates
3. **Catering Portion Calculator** - Calculates food portions based on guest count and meal specifications

## Deployment

The MCP server is automatically deployed as part of the Evana application at:

```
https://your-evana-domain.com/api/mcp
```

## Available Tools

### 1. Calculate Event Capacity (`calculate_event_capacity`)

Calculates optimal event capacity and provides venue recommendations.

**Parameters:**

- `guestCount` (number): Number of expected guests (1-10,000)
- `eventType` (enum): Type of event - `wedding`, `engagement`, `corporate`, `birthday`, `anniversary`
- `includeBuffer` (boolean): Whether to include 15% comfort buffer (default: true)

**Returns:** Detailed capacity analysis with space breakdowns and event-specific recommendations.

**Example Usage:**

```
Calculate event capacity for 150 guests at a wedding with buffer included
```

### 2. Analyze RSVP Trends (`analyze_rsvp_trends`)

Analyzes RSVP patterns and provides actionable insights for event planning.

**Parameters:**

- `totalInvited` (number): Total number of people invited
- `currentRSVPs` (number): Number of current responses
- `daysUntilEvent` (number): Days remaining until the event
- `responseRate` (number, optional): Override response rate calculation

**Returns:** RSVP analysis with projections, urgency levels, and action recommendations.

**Example Usage:**

```
Analyze RSVP trends for 200 invited guests, 120 current RSVPs, 21 days until event
```

### 3. Calculate Catering Portions (`calculate_catering_portions`)

Calculates appropriate food portions based on guest count and service style.

**Parameters:**

- `guestCount` (number): Number of guests to serve
- `mealType` (enum): `breakfast`, `lunch`, `dinner`, `cocktail`, `dessert`
- `serviceStyle` (enum): `plated`, `buffet`, `family_style`, `cocktail_reception`
- `dietaryRestrictions` (array, optional): List of dietary restrictions to accommodate

**Returns:** Detailed portion calculations with pro tips and dietary accommodation suggestions.

**Example Usage:**

```
Calculate catering portions for 80 guests, dinner, buffet style with vegetarian and gluten-free restrictions
```

## Setting up MCP Clients

### Cursor Configuration

Add the following to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "evana": {
      "url": "https://your-evana-domain.com/api/mcp"
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "evana": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://your-evana-domain.com/api/mcp"]
    }
  }
}
```

## Use Cases

### Event Planners

- Calculate optimal venue sizes for different event types
- Analyze RSVP trends to make informed decisions
- Plan catering quantities with confidence

### Venue Managers

- Provide accurate capacity recommendations to clients
- Optimize space allocation for different event components

### Caterers

- Calculate precise portion sizes based on service style
- Account for dietary restrictions and special requirements

## Benefits

- **Accuracy**: Based on industry standards and best practices
- **Efficiency**: Instant calculations that normally require manual research
- **Intelligence**: Context-aware recommendations for different event types
- **Integration**: Seamlessly integrates with AI assistants for natural language queries

## Technical Details

- Built with `@vercel/mcp-adapter` for serverless deployment
- Uses Zod for robust input validation
- Optimized for Vercel Functions with Fluid compute
- Stateless design for reliable scaling

## Support

For technical support or feature requests, contact the Evana development team.
