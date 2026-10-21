/**
 * Validation Utilities Module
 * Provides validation functions for the stock analysis engine
 */

const { ERROR_CODES } = require('../config/constants');

class ValidationUtils {
  constructor() {}

  /**
   * Validate stock symbol
   * @param {string} symbol - Stock symbol to validate
   * @returns {object} Validation result
   */
  validateSymbol(symbol) {
    const result = {
      valid: true,
      symbol: symbol,
      errors: [],
      warnings: []
    };

    if (!symbol || typeof symbol !== 'string') {
      result.valid = false;
      result.errors.push('Symbol must be a non-empty string');
      return result;
    }

    // Trim and uppercase
    const cleanedSymbol = symbol.trim().toUpperCase();
    result.symbol = cleanedSymbol;

    // Check length
    if (cleanedSymbol.length < 1 || cleanedSymbol.length > 10) {
      result.valid = false;
      result.errors.push('Symbol must be between 1 and 10 characters');
    }

    // Check for valid characters (letters, numbers, dots, hyphens)
    const validChars = /^[A-Z0-9\.\-]+$/;
    if (!validChars.test(cleanedSymbol)) {
      result.valid = false;
      result.errors.push('Symbol can only contain letters, numbers, dots, and hyphens');
    }

    // Check for common patterns
    if (cleanedSymbol.endsWith('.TO') || cleanedSymbol.endsWith('.V') || cleanedSymbol.endsWith('.TSE')) {
      result.warnings.push('Canadian stock detected. Data availability may be limited.');
    }

    if (cleanedSymbol.includes('-')) {
      result.warnings.push('Symbol contains hyphen. This may indicate a special security type.');
    }

    return result;
  }

  /**
   * Validate multiple symbols
   * @param {string|string[]} symbols - Symbol(s) to validate
   * @returns {object} Validation results
   */
  validateSymbols(symbols) {
    if (typeof symbols === 'string') {
      return this.validateSymbol(symbols);
    }

    if (!Array.isArray(symbols)) {
      return {
        valid: false,
        errors: ['Symbols must be a string or array of strings']
      };
    }

    const results = {
      valid: true,
      validSymbols: [],
      invalidSymbols: [],
      errors: [],
      warnings: []
    };

    for (const symbol of symbols) {
      const validation = this.validateSymbol(symbol);
      if (validation.valid) {
        results.validSymbols.push(validation.symbol);
        results.warnings.push(...validation.warnings);
      } else {
        results.valid = false;
        results.invalidSymbols.push(symbol);
        results.errors.push(...validation.errors);
      }
    }

    return results;
  }

  /**
   * Validate analysis options
   * @param {object} options - Analysis options to validate
   * @returns {object} Validation result
   */
  validateAnalysisOptions(options = {}) {
    const result = {
      valid: true,
      options: {},
      errors: [],
      warnings: []
    };

    // Validate period
    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
    if (options.period && !validPeriods.includes(options.period)) {
      result.valid = false;
      result.errors.push(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    } else {
      result.options.period = options.period || '1y';
    }

    // Validate interval
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    if (options.interval && !validIntervals.includes(options.interval)) {
      result.valid = false;
      result.errors.push(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
    } else {
      result.options.interval = options.interval || '1d';
    }

    // Validate boolean options
    const booleanOptions = [
      'includeIndicators',
      'includePatterns',
      'includePredictions',
      'includeRecommendations'
    ];

    for (const opt of booleanOptions) {
      if (options[opt] !== undefined && typeof options[opt] !== 'boolean') {
        result.valid = false;
        result.errors.push(`${opt} must be a boolean`);
      } else {
        result.options[opt] = options[opt] !== false; // Default to true
      }
    }

    return result;
  }

  /**
   * Validate OHLCV data
   * @param {Array} data - OHLCV data to validate
   * @returns {object} Validation result
   */
  validateOHLCVData(data) {
    const result = {
      valid: true,
      data: data,
      errors: [],
      warnings: []
    };

    if (!Array.isArray(data)) {
      result.valid = false;
      result.errors.push('Data must be an array');
      return result;
    }

    if (data.length === 0) {
      result.valid = false;
      result.errors.push('Data array cannot be empty');
      return result;
    }

    // Check required fields
    const requiredFields = ['date', 'open', 'high', 'low', 'close', 'volume'];
    const firstBar = data[0];

    for (const field of requiredFields) {
      if (firstBar[field] === undefined) {
        result.valid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check data types
    for (const bar of data) {
      if (bar.date && typeof bar.date !== 'string') {
        result.warnings.push('Date should be a string');
        break;
      }

      if (bar.open !== undefined && typeof bar.open !== 'number') {
        result.warnings.push('Open price should be a number');
        break;
      }

      if (bar.high !== undefined && typeof bar.high !== 'number') {
        result.warnings.push('High price should be a number');
        break;
      }

      if (bar.low !== undefined && typeof bar.low !== 'number') {
        result.warnings.push('Low price should be a number');
        break;
      }

      if (bar.close !== undefined && typeof bar.close !== 'number') {
        result.warnings.push('Close price should be a number');
        break;
      }

      if (bar.volume !== undefined && typeof bar.volume !== 'number') {
        result.warnings.push('Volume should be a number');
        break;
      }
    }

    // Check for NaN or infinite values
    const numericFields = ['open', 'high', 'low', 'close', 'volume'];
    for (const bar of data) {
      for (const field of numericFields) {
        if (bar[field] !== undefined) {
          if (isNaN(bar[field]) || !isFinite(bar[field])) {
            result.warnings.push(`Invalid ${field} value: ${bar[field]}`);
          }
        }
      }
    }

    // Sort by date if needed
    if (result.valid) {
      result.data = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return result;
  }

  /**
   * Validate prediction options
   * @param {object} options - Prediction options to validate
   * @returns {object} Validation result
   */
  validatePredictionOptions(options = {}) {
    const result = {
      valid: true,
      options: {},
      errors: [],
      warnings: []
    };

    // Validate forecast horizon
    if (options.forecastHorizon !== undefined) {
      if (typeof options.forecastHorizon !== 'number' || options.forecastHorizon <= 0) {
        result.valid = false;
        result.errors.push('forecastHorizon must be a positive number');
      } else {
        result.options.forecastHorizon = Math.floor(options.forecastHorizon);
      }
    } else {
      result.options.forecastHorizon = 1;
    }

    // Validate model-specific options
    if (options.models) {
      if (!Array.isArray(options.models)) {
        result.valid = false;
        result.errors.push('models must be an array');
      } else {
        result.options.models = options.models;
      }
    }

    return result;
  }

  /**
   * Validate indicator options
   * @param {object} options - Indicator options to validate
   * @returns {object} Validation result
   */
  validateIndicatorOptions(options = {}) {
    const result = {
      valid: true,
      options: {},
      errors: [],
      warnings: []
    };

    // Validate period
    if (options.period !== undefined) {
      if (typeof options.period !== 'number' || options.period <= 0) {
        result.valid = false;
        result.errors.push('period must be a positive number');
      } else {
        result.options.period = Math.floor(options.period);
      }
    }

    // Validate source
    const validSources = ['open', 'high', 'low', 'close', 'typical'];
    if (options.source && !validSources.includes(options.source)) {
      result.valid = false;
      result.errors.push(`source must be one of: ${validSources.join(', ')}`);
    } else {
      result.options.source = options.source || 'close';
    }

    return result;
  }

  /**
   * Create validation error
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @returns {Error} Validation error
   */
  createValidationError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.isValidationError = true;
    return error;
  }

  /**
   * Validate API request
   * @param {object} req - Express request object
   * @returns {object} Validation result
   */
  validateApiRequest(req) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check content type for POST requests
    if (req.method === 'POST' && !req.is('application/json')) {
      result.warnings.push('Content-Type should be application/json for POST requests');
    }

    // Check for required headers
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      if (!req.headers['content-type']) {
        result.warnings.push('Content-Type header is recommended');
      }
    }

    return result;
  }

  /**
   * Validate rate limiting
   * @param {string} ip - Client IP address
   * @param {number} maxRequests - Maximum allowed requests
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} Rate limit status
   */
  validateRateLimit(ip, maxRequests = 60, windowMs = 60000) {
    const result = {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs
    };

    // In a real implementation, this would track requests per IP
    // For now, we'll just return the default values
    return result;
  }
}

module.exports = new ValidationUtils();
