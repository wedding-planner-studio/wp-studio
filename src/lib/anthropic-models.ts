export const AnthropicModels = {
  'claude-4-opus-20250101': {
    model: 'claude-4-opus-20250101',
    description: 'Claude Opus 4',
    pricing: {
      input: 15, // $/million tokens
      output: 75, // $/million tokens
      cache_5m_write: 18.75, // $/million tokens
      cache_1h_write: 30, // $/million tokens
      cache_hit: 1.5, // $/million tokens
    },
  },
  'claude-4-sonnet-20250101': {
    model: 'claude-4-sonnet-20250101',
    description: 'Claude Sonnet 4',
    pricing: {
      input: 3, // $/million tokens
      output: 15, // $/million tokens
      cache_5m_write: 3.75, // $/million tokens
      cache_1h_write: 6, // $/million tokens
      cache_hit: 0.3, // $/million tokens
    },
  },
  'claude-3-7-sonnet-20250219': {
    model: 'claude-3-7-sonnet-20250219',
    description: 'Claude Sonnet 3.7',
    pricing: {
      input: 3, // $/million tokens
      output: 15, // $/million tokens
      cache_5m_write: 3.75, // $/million tokens
      cache_1h_write: 6, // $/million tokens
      cache_hit: 0.3, // $/million tokens
    },
  },
  'claude-3-5-sonnet-20240620': {
    model: 'claude-3-5-sonnet-20240620',
    description: 'Claude Sonnet 3.5',
    pricing: {
      input: 3, // $/million tokens
      output: 15, // $/million tokens
      cache_5m_write: 3.75, // $/million tokens
      cache_1h_write: 6, // $/million tokens
      cache_hit: 0.3, // $/million tokens
    },
  },
  'claude-3-5-haiku-20240701': {
    model: 'claude-3-5-haiku-20240701',
    description: 'Claude Haiku 3.5',
    pricing: {
      input: 0.8, // $/million tokens
      output: 4, // $/million tokens
      cache_5m_write: 1, // $/million tokens
      cache_1h_write: 1.6, // $/million tokens
      cache_hit: 0.08, // $/million tokens
    },
  },
  'claude-3-opus-20240229': {
    model: 'claude-3-opus-20240229',
    description: 'Claude Opus 3',
    pricing: {
      input: 15, // $/million tokens
      output: 75, // $/million tokens
      cache_5m_write: 18.75, // $/million tokens
      cache_1h_write: 30, // $/million tokens
      cache_hit: 1.5, // $/million tokens
    },
  },
  'claude-3-haiku-20240307': {
    model: 'claude-3-haiku-20240307',
    description: 'Claude Haiku 3',
    pricing: {
      input: 0.25, // $/million tokens
      output: 1.25, // $/million tokens
      cache_5m_write: 0.3, // $/million tokens
      cache_1h_write: 0.5, // $/million tokens
      cache_hit: 0.03,
    },
  },
  'claude-opus-4-20250514': {
    model: 'claude-opus-4-20250514',
    description: 'Claude Opus 4',
    pricing: {
      input: 15, // $/million tokens
      output: 75, // $/million tokens
      cache_5m_write: 18.75, // $/million tokens
      cache_1h_write: 30, // $/million tokens
      cache_hit: 1.5, // $/million tokens
    },
  },
  'claude-sonnet-4-20250514': {
    model: 'claude-sonnet-4-20250514',
    description: 'Claude Sonnet 4',
    pricing: {
      input: 3, // $/million tokens
      output: 15, // $/million tokens
      cache_5m_write: 3.75, // $/million tokens
      cache_1h_write: 6, // $/million tokens
      cache_hit: 0.3, // $/million tokens
    },
  },
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    description: 'Claude Sonnet 3.5',
    pricing: {
      input: 3, // $/million tokens
      output: 15, // $/million tokens
      cache_5m_write: 3.75, // $/million tokens
      cache_1h_write: 6, // $/million tokens
      cache_hit: 0.3, // $/million tokens
    },
  },
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    description: 'Claude Haiku 3.5',
    pricing: {
      input: 0.8, // $/million tokens
      output: 4, // $/million tokens
      cache_5m_write: 1, // $/million tokens
      cache_1h_write: 1.6, // $/million tokens
      cache_hit: 0.08, // $/million tokens
    },
  },
};

export const AnthropicModelAliases = {
  'claude-opus-4-0': 'claude-opus-4-20250514',
  'claude-sonnet-4-0': 'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest': 'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-latest': 'claude-3-5-haiku-20241022',
  'claude-3-opus-latest': 'claude-3-opus-20240229',
};
