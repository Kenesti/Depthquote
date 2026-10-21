/**
 * Data Scraper Module for Depthquote
 * Fetches historical stock data from Yahoo Finance
 */

const axios = require('axios');
const moment = require('moment');
const { DATA_SOURCES } = require('../../config/constants');

// Try to use yahoo-finance2 if available, fall back to direct API
let yahooFinance;
try {
  yahooFinance = require('yahoo-finance2').default;
} catch (error) {
  yahooFinance = null;
}

class YahooFinanceClient {
  constructor() {
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
    this.cache = new Map();
    this.useYahooFinance2 = yahooFinance !== null;
  }

  /**
   * Fetch historical data for a symbol
   * @param {string} symbol - Stock symbol
   * @param {object} options - Fetch options
   * @returns {Promise<Array>} Historical OHLCV data
   */
  async fetchHistoricalData(symbol, options = {}) {
    const { period = '1y', interval = '1d' } = options;
    
    const cacheKey = `${symbol.toUpperCase()}_${period}_${interval}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      if (this.useYahooFinance2) {
        return await this._fetchWithYahooFinance2(symbol, period, interval, cacheKey);
      }
      
      const params = this._buildParams(symbol, period, interval);
      const response = await axios.get(this.baseUrl, { params });
      
      if (!response.data || !response.data.chart || !response.data.chart.result) {
        throw new Error(`No data available for ${symbol}`);
      }

      const result = response.data.chart.result[0];
      const data = this._parseResult(result, symbol);
      
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error.message);
      throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Fetch using yahoo-finance2 library
   */
  async _fetchWithYahooFinance2(symbol, period, interval, cacheKey) {
    try {
      const result = await yahooFinance[symbol].historical({
        period1: this._getPeriodStartDate(period),
        period2: new Date(),
        interval: this._mapInterval(interval)
      });
      
      if (!result || result.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      const data = this._parseYahooFinance2Result(result, symbol);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`yahoo-finance2 error for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Build query parameters for Yahoo Finance API
   */
  _buildParams(symbol, period, interval) {
    const periodMap = {
      '1d': '1d',
      '5d': '5d',
      '1mo': '1mo',
      '3mo': '3mo',
      '6mo': '6mo',
      '1y': '1y',
      '2y': '2y',
      '5y': '5y',
      '10y': '10y',
      'ytd': 'ytd',
      'max': 'max'
    };

    const intervalMap = {
      '1m': '1m',
      '2m': '2m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '60m': '60m',
      '90m': '90m',
      '1h': '1h',
      '1d': '1d',
      '5d': '5d',
      '1wk': '1wk',
      '1mo': '1mo',
      '3mo': '3mo'
    };

    return {
      symbol: symbol.toUpperCase(),
      period: periodMap[period] || period,
      interval: intervalMap[interval] || interval,
      includePrePost: true,
      events: 'div,splits'
    };
  }

  /**
   * Map interval for yahoo-finance2
   */
  _mapInterval(interval) {
    const map = {
      '1m': '1m',
      '2m': '2m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '60m': '1h',
      '90m': '90m',
      '1h': '1h',
      '1d': '1d',
      '5d': '5d',
      '1wk': '1wk',
      '1mo': '1mo',
      '3mo': '3mo'
    };
    return map[interval] || interval;
  }

  /**
   * Get start date based on period
   */
  _getPeriodStartDate(period) {
    const now = new Date();
    const map = {
      '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '5d': new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      '1mo': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '3mo': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '6mo': new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      '2y': new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000),
      '5y': new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000),
      '10y': new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000),
      'ytd': new Date(now.getFullYear(), 0, 1),
      'max': new Date(0)
    };
    return map[period] || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  /**
   * Parse yahoo-finance2 result
   */
  _parseYahooFinance2Result(result, symbol) {
    if (!Array.isArray(result) || result.length === 0) {
      return [];
    }

    return result.map(item => ({
      symbol: symbol.toUpperCase(),
      date: item.date.toISOString(),
      timestamp: Math.floor(item.date.getTime() / 1000),
      open: item.open || null,
      high: item.high || null,
      low: item.low || null,
      close: item.close || null,
      volume: item.volume || 0,
      adjustedClose: item.adjClose || item.close || null
    }));
  }

  /**
   * Parse Yahoo Finance API response
   */
  _parseResult(result, symbol) {
    if (!result || !result.timestamp || !result.indicators) {
      return [];
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const volumes = result.indicators.quote[1];

    if (!timestamps || !quotes || !volumes) {
      return [];
    }

    const data = [];
    for (let i = 0; i < timestamps.length; i++) {
      const date = moment.unix(timestamps[i]).toDate();
      
      data.push({
        symbol: symbol.toUpperCase(),
        date: date.toISOString(),
        timestamp: timestamps[i],
        open: quotes.open[i] || null,
        high: quotes.high[i] || null,
        low: quotes.low[i] || null,
        close: quotes.close[i] || null,
        volume: volumes.volume[i] || 0,
        adjustedClose: quotes.adjclose[i] || null
      });
    }

    return data;
  }

  /**
   * Get current data for a symbol
   */
  async getCurrentData(symbol) {
    try {
      const data = await this.fetchHistoricalData(symbol, { period: '1d', interval: '1m' });
      return data[data.length - 1] || null;
    } catch (error) {
      throw new Error(`Failed to get current data for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Get company information
   */
  async getCompanyInfo(symbol) {
    try {
      const response = await axios.get(`https://query2.finance.yahoo.com/v7/finance/download/${symbol.toUpperCase()}?period1=0&period2=9999999999&interval=1d&events=history`);
      // For now, return basic info
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        source: DATA_SOURCES.YAHOO_FINANCE
      };
    } catch (error) {
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        source: DATA_SOURCES.YAHOO_FINANCE
      };
    }
  }

  /**
   * Validate symbol
   */
  async validateSymbol(symbol) {
    try {
      const data = await this.fetchHistoricalData(symbol, { period: '1d' });
      return data.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const dataScraper = new YahooFinanceClient();
module.exports = dataScraper;
