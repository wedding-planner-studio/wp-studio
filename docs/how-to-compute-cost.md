Based on a response like this one, what's the best way of computing the cost?

API Call response: {
id: 'msg_019hXYTpMf4KPmFQQVumpb2g',
type: 'message',
role: 'assistant',
model: 'claude-3-7-sonnet-20250219',
content: [
{
type: 'text',
text: '¡Hola! Encantado de saludarte. Veo que estás invitado a varios eventos. Para la boda de Juan y Lorea el 10 de marzo de 2026, noté que tus acompañantes Sergio y Esteban aún tienen confirmación pendiente. ¿Te gustaría confirmar si ellos asistirán al evento?'
}
],
stop_reason: 'end_turn',
stop_sequence: null,
usage: {
input_tokens: 4,
cache_creation_input_tokens: 0,
cache_read_input_tokens: 6421,
output_tokens: 96,
service_tier: 'standard'
}
}

Based on your API response, here's how to compute the cost using the usage object 1:

Cost calculation for Claude 3.7 Sonnet:

Input tokens: 4 tokens × $3.00 per MTok = $0.000012
Cache read tokens: 6,421 tokens × $0.30 per MTok = $0.001926
Output tokens: 96 tokens × $15.00 per MTok = $0.001440
Total cost: ~$0.003378

Key components from your response:

json
"usage": {
"input_tokens": 4,
"cache_creation_input_tokens": 0,
"cache_read_input_tokens": 6421,
"output_tokens": 96
}
1

Cost formula:
Total cost = (input_tokens × input_rate) + (cache_read_input_tokens × cache_read_rate) + (output_tokens × output_rate) 1

The cache_read_input_tokens indicates you're successfully using prompt caching, which significantly reduces costs since cached tokens are charged at $0.30 per MTok instead of $3.00 per MTok 2. Your event context (6,421 tokens) was retrieved from cache rather than processed as new input tokens 2.

For ongoing cost optimization, monitor the ratio of cache_read_input_tokens to input_tokens - higher cache usage means better cost efficiency 2.

\*\*
