/**
 * API Service Module for Depthquote
 * Provides RESTful API endpoints for the stock analysis engine
 */

const express = require('express');
const cors = require('cors');
const analysisEngine = require('../lib/analysis');
const dataScraper = require('../lib/data/dataScraper');
const technicalIndicators = require('../lib/indicators');
const patternRecognition = require('../lib/patterns');
const { API_ENDPOINTS, ERROR_CODES, RATE_LIMITS } = require('../config/constants');

class ApiService {
  constructor() {
    this.app = express();
    this.router = express.Router();
    this.rateLimiter = this._createRateLimiter();
    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  _setupMiddleware() {
    // Enable CORS
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Apply rate limiting
    this.app.use(this.rateLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Error handling middleware
    this.app.use(this._errorHandler.bind(this));
  }

  /**
   * Create rate limiter
   */
  _createRateLimiter() {
    const requests = new Map();

    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (requests.has(ip)) {
        const oldRequests = requests.get(ip);
        const recentRequests = oldRequests.filter(timestamp => now - timestamp < 60000);
        requests.set(ip, recentRequests);
      } else {
        requests.set(ip, []);
      }

      const requestCount = requests.get(ip).length;
      if (requestCount >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
        return res.status(429).json({
          error: {
            code: ERROR_CODES.RATE_LIMITED,
            message: `Rate limit exceeded. Maximum ${RATE_LIMITS.REQUESTS_PER_MINUTE} requests per minute.`
          }
        });
      }

      requests.get(ip).push(now);
      next();
    };
  }

  /**
   * Setup API routes
   */
  _setupRoutes() {
    this.app.use('/api', this.router);

    // Health check endpoint
    this.router.get(API_ENDPOINTS.HEALTH, this._healthCheck.bind(this));

    // Analysis endpoints
    this.router.post(API_ENDPOINTS.ANALYZE, this._analyzeHandler.bind(this));
    this.router.get(API_ENDPOINTS.ANALYZE, this._analyzeHandler.bind(this));

    // Historical data endpoints
    this.router.get(API_ENDPOINTS.HISTORICAL_DATA, this._historicalDataHandler.bind(this));
    this.router.get('/api/historical/:symbol', this._historicalSingleHandler.bind(this));

    // Indicators endpoint
    this.router.get(API_ENDPOINTS.INDICATORS, this._indicatorsHandler.bind(this));
    this.router.get('/api/indicators/:symbol', this._indicatorsSingleHandler.bind(this));

    // Patterns endpoint
    this.router.get(API_ENDPOINTS.PATTERNS, this._patternsHandler.bind(this));

    // Predictions endpoint
    this.router.get(API_ENDPOINTS.PREDICTIONS, this._predictionsHandler.bind(this));

    // Root endpoint
    this.router.get('/', (req, res) => {
      res.json({
        name: 'Depthquote API',
        version: '1.0.0',
        endpoints: Object.values(API_ENDPOINTS).map(endpoint => ({
          path: endpoint,
          method: 'GET/POST'
        }))
      });
    });
  }

  /**
   * Health check handler
   */
  _healthCheck(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  /**
   * Analyze handler
   */
  async _analyzeHandler(req, res) {
    try {
      const { symbols, options } = this._parseAnalyzeRequest(req);

      if (!symbols || symbols.length === 0) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'At least one symbol is required.'
          }
        });
      }

      const results = await analysisEngine.analyze(symbols, options);

      res.json({
        success: true,
        results: Array.isArray(results) ? results : [results],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Historical data handler
   */
  async _historicalDataHandler(req, res) {
    try {
      const { symbol, period, interval } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol, {
        period: period || '1y',
        interval: interval || '1d'
      });

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Historical single symbol handler
   */
  async _historicalSingleHandler(req, res) {
    try {
      const { symbol } = req.params;
      const { period, interval } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol.toUpperCase(), {
        period: period || '1y',
        interval: interval || '1d'
      });

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Indicators handler
   */
  async _indicatorsHandler(req, res) {
    try {
      const { symbol, period, interval, indicators } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol, {
        period: period || '1y',
        interval: interval || '1d'
      });

      let indicatorList = [];
      if (indicators) {
        indicatorList = indicators.split(',').map(i => i.trim());
      }

      const dataWithIndicators = indicatorList.length > 0 ?
        await technicalIndicators.calculate(data, indicatorList) :
        await technicalIndicators.calculateAll(data);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        data: dataWithIndicators,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Indicators single symbol handler
   */
  async _indicatorsSingleHandler(req, res) {
    try {
      const { symbol } = req.params;
      const { period, interval, indicators } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol.toUpperCase(), {
        period: period || '1y',
        interval: interval || '1d'
      });

      let indicatorList = [];
      if (indicators) {
        indicatorList = indicators.split(',').map(i => i.trim());
      }

      const dataWithIndicators = indicatorList.length > 0 ?
        await technicalIndicators.calculate(data, indicatorList) :
        await technicalIndicators.calculateAll(data);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        data: dataWithIndicators,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Patterns handler
   */
  async _patternsHandler(req, res) {
    try {
      const { symbol, period, interval, patternType } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol, {
        period: period || '1y',
        interval: interval || '1d'
      });

      const dataWithPatterns = await patternRecognition.identifyAll(data, {
        includeSingle: true,
        includeMulti: true
      });

      let patterns = [];
      dataWithPatterns.forEach(bar => {
        if (bar.patterns) {
          bar.patterns.forEach(pattern => {
            if (!patternType || pattern.type === patternType) {
              patterns.push({
                ...pattern,
                date: bar.date
              });
            }
          });
        }
        if (bar.chartPatterns) {
          bar.chartPatterns.forEach(pattern => {
            if (!patternType || pattern.type === patternType) {
              patterns.push({
                ...pattern,
                date: bar.date
              });
            }
          });
        }
      });

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        patterns: patterns,
        statistics: patternRecognition.getStatistics(dataWithPatterns),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Predictions handler
   */
  async _predictionsHandler(req, res) {
    try {
      const { symbol, period, interval, models } = req.query;

      if (!symbol) {
        return res.status(400).json({
          error: {
            code: ERROR_CODES.INVALID_PARAMETERS,
            message: 'Symbol parameter is required.'
          }
        });
      }

      const data = await dataScraper.fetchHistoricalData(symbol, {
        period: period || '1y',
        interval: interval || '1d'
      });

      const availableModels = predictionEngine.getAvailableModels();
      const modelsToRun = models ?
        models.split(',').filter(m => availableModels.all.includes(m)) :
        availableModels.all;

      const results = {};
      for (const model of modelsToRun) {
        try {
          results[model] = await predictionEngine.predict(model, data, {
            forecastHorizon: 5
          });
        } catch (error) {
          results[model] = { error: error.message };
        }
      }

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        predictions: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Parse analyze request
   */
  _parseAnalyzeRequest(req) {
    let symbols = [];
    let options = {};

    if (req.method === 'GET') {
      const { symbols: symbolsParam, ...queryOptions } = req.query;
      symbols = symbolsParam ? symbolsParam.split(',') : [];
      options = queryOptions;
    } else if (req.method === 'POST' && req.body) {
      symbols = req.body.symbols || [];
      options = req.body.options || {};
    }

    symbols = symbols.map(s => s.toString().trim().toUpperCase());

    return { symbols, options };
  }

  /**
   * Handle errors
   */
  _handleError(res, error) {
    console.error('API Error:', error);

    if (error.message.includes(ERROR_CODES.INVALID_SYMBOL)) {
      res.status(404).json({
        error: {
          code: ERROR_CODES.INVALID_SYMBOL,
          message: 'Invalid stock symbol.'
        }
      });
    } else if (error.message.includes(ERROR_CODES.DATA_NOT_AVAILABLE)) {
      res.status(404).json({
        error: {
          code: ERROR_CODES.DATA_NOT_AVAILABLE,
          message: 'Data not available for the requested symbol.'
        }
      });
    } else if (error.message.includes(ERROR_CODES.RATE_LIMITED)) {
      res.status(429).json({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Rate limit exceeded.'
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: error.message || 'An internal error occurred.'
        }
      });
    }
  }

  /**
   * Error handling middleware
   */
  _errorHandler(err, req, res, next) {
    console.error('Unhandled Error:', err);
    res.status(500).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: err.message || 'An unexpected error occurred.'
      }
    });
  }

  /**
   * Start the API server
   * @param {number} port - Port to listen on
   * @returns {Promise} Server instance
   */
  async start(port = 3000) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Depthquote API started on port ${port}`);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          console.error('Server Error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   * @returns {Promise} Resolution when server is stopped
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            reject(error);
          } else {
            console.log('Depthquote API stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
const apiService = new ApiService();
module.exports = apiService;
