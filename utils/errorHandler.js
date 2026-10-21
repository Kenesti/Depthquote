/**
 * Error Handler Module for Depthquote
 * Centralized error handling for the stock analysis engine
 */

const { ERROR_CODES } = require('../config/constants');

class ErrorHandler {
  constructor() {
    this.StockAnalysisError = class StockAnalysisError extends Error {
      constructor(message, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
        super(message);
        this.name = 'StockAnalysisError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.isStockAnalysisError = true;
      }
    };

    this.ValidationError = class ValidationError extends this.StockAnalysisError {
      constructor(message, details = null) {
        super(message, ERROR_CODES.INVALID_PARAMETERS, details);
        this.name = 'ValidationError';
      }
    };

    this.DataError = class DataError extends this.StockAnalysisError {
      constructor(message, details = null) {
        super(message, ERROR_CODES.DATA_NOT_AVAILABLE, details);
        this.name = 'DataError';
      }
    };

    this.SymbolError = class SymbolError extends this.StockAnalysisError {
      constructor(message, details = null) {
        super(message, ERROR_CODES.INVALID_SYMBOL, details);
        this.name = 'SymbolError';
      }
    };

    this.RateLimitError = class RateLimitError extends this.StockAnalysisError {
      constructor(message, details = null) {
        super(message, ERROR_CODES.RATE_LIMITED, details);
        this.name = 'RateLimitError';
      }
    };
  }

  createError(message, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
    return new this.StockAnalysisError(message, code, details);
  }

  createValidationError(message, details = null) {
    return new this.ValidationError(message, details);
  }

  createDataError(message, details = null) {
    return new this.DataError(message, details);
  }

  createSymbolError(message, details = null) {
    return new this.SymbolError(message, details);
  }

  createRateLimitError(message, details = null) {
    return new this.RateLimitError(message, details);
  }

  handleError(error) {
    if (error.isStockAnalysisError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: error.timestamp
        }
      };
    }

    if (error.name === 'ValidationError') {
      return this.handleError(this.createValidationError(error.message));
    }

    if (error.message && error.message.includes('No data available')) {
      return this.handleError(this.createDataError(error.message));
    }

    if (error.message && error.message.includes('Invalid symbol')) {
      return this.handleError(this.createSymbolError(error.message));
    }

    if (error.message && error.message.includes('Rate limit')) {
      return this.handleError(this.createRateLimitError(error.message));
    }

    return this.handleError(this.createError(error.message));
  }

  handleApiError(error, req, res) {
    const formattedError = this.handleError(error);

    let statusCode = 500;
    switch (formattedError.error.code) {
      case ERROR_CODES.INVALID_PARAMETERS:
        statusCode = 400;
        break;
      case ERROR_CODES.INVALID_SYMBOL:
      case ERROR_CODES.DATA_NOT_AVAILABLE:
        statusCode = 404;
        break;
      case ERROR_CODES.RATE_LIMITED:
        statusCode = 429;
        break;
      default:
        statusCode = 500;
    }

    res.status(statusCode).json(formattedError);
  }

  logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    };

    console.error('[ERROR]', errorInfo);
  }

  asyncWrapper(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        this.handleApiError(error, req, res);
      }
    };
  }

  createErrorMiddleware() {
    return (error, req, res, next) => {
      this.handleApiError(error, req, res);
    };
  }

  isStockAnalysisError(error) {
    return error && error.isStockAnalysisError === true;
  }

  getErrorDetails(error) {
    if (!error) {
      return 'No error provided';
    }

    const details = [];
    details.push(`Error: ${error.name || 'Error'}`);
    details.push(`Message: ${error.message || 'No message'}`);

    if (error.code) {
      details.push(`Code: ${error.code}`);
    }

    if (error.details) {
      details.push(`Details: ${JSON.stringify(error.details)}`);
    }

    if (error.timestamp) {
      details.push(`Timestamp: ${error.timestamp}`);
    }

    return details.join('\n');
  }
}

module.exports = new ErrorHandler();
