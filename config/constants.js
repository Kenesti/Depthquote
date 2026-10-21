// Configuration constants for Depthquote

module.exports = {
  // Data sources
  DATA_SOURCES: {
    YAHOO_FINANCE: 'yahoo-finance',
    ALPHA_VANTAGE: 'alpha-vantage',
    YFINANCE: 'yfinance'
  },
  
  // Default analysis periods
  ANALYSIS_PERIODS: {
    SHORT_TERM: '1mo',
    MEDIUM_TERM: '3mo',
    LONG_TERM: '1y',
    CUSTOM: 'custom'
  },
  
  // Technical indicator thresholds
  INDICATOR_THRESHOLDS: {
    RSI: {
      OVERBOUGHT: 70,
      OVERSOLD: 30,
      NEUTRAL: 50
    },
    MACD: {
      BULLISH: 'positive_crossover',
      BEARISH: 'negative_crossover'
    },
    BOLLINGER: {
      OVERBOUGHT: 'upper_band',
      OVERSOLD: 'lower_band'
    },
    STOCHASTIC: {
      OVERBOUGHT: 80,
      OVERSOLD: 20
    }
  },
  
  // Candlestick pattern types
  CANDLE_PATTERNS: {
    BULLISH: [
      'hammer', 'inverted_hammer', 'bullish_engulfing', 'piercing_line',
      'morning_star', 'three_white_soldiers', 'bullish_harami',
      'tweezer_bottom', 'three_inside_up', 'rising_three_methods'
    ],
    BEARISH: [
      'shooting_star', 'hanging_man', 'bearish_engulfing', 'dark_cloud_cover',
      'evening_star', 'three_black_crows', 'bearish_harami',
      'tweezer_top', 'three_inside_down', 'falling_three_methods'
    ],
    NEUTRAL: [
      'doji', 'spinning_top', 'long_legged_doji', 'dragonfly_doji',
      'gravestone_doji', 'high_wave', 'marubozu'
    ]
  },
  
  // Prediction methods
  PREDICTION_METHODS: {
    STATISTICAL: ['linear_regression', 'polynomial_regression', 'exponential_regression'],
    TIME_SERIES: ['arima', 'sarima', 'holt_winters', 'prophet'],
    MACHINE_LEARNING: ['lstm', 'random_forest', 'gradient_boosting', 'svm'],
    TECHNICAL: ['moving_average_crossover', 'bollinger_band_width', 'rsi_divergence']
  },
  
  // Analysis weights for final scoring
  ANALYSIS_WEIGHTS: {
    TECHNICAL_INDICATORS: 0.40,
    CANDLE_PATTERNS: 0.25,
    PREDICTION_MODELS: 0.25,
    VOLUME_ANALYSIS: 0.10
  },
  
  // API endpoints
  API_ENDPOINTS: {
    ANALYZE: '/api/analyze',
    HISTORICAL_DATA: '/api/historical',
    INDICATORS: '/api/indicators',
    PATTERNS: '/api/patterns',
    PREDICTIONS: '/api/predictions',
    HEALTH: '/api/health'
  },
  
  // Rate limiting
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000
  },
  
  // Cache settings
  CACHE_SETTINGS: {
    TTL: 3600, // 1 hour in seconds
    MAX_ITEMS: 1000
  },
  
  // Error codes
  ERROR_CODES: {
    INVALID_SYMBOL: 'INVALID_SYMBOL',
    DATA_NOT_AVAILABLE: 'DATA_NOT_AVAILABLE',
    RATE_LIMITED: 'RATE_LIMITED',
    INVALID_PARAMETERS: 'INVALID_PARAMETERS',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED'
  },
  
  // Default settings
  DEFAULT_SETTINGS: {
    ANALYSIS_PERIOD: '7d',
    ANALYSIS_INTERVAL: '1d',
    MAX_STOCKS: 10,
    CACHE_ENABLED: true
  }
};
