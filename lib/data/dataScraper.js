/**
 * Data Scraper Module for Depthquote
 * Fetches historical stock data from Yahoo Finance
 */

const axios = require('axios');
const moment = require('moment');
const { DATA_SOURCES } = require('../../config/constants');

class YahooFinanceClient {
  constructor() {
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
    this.cache = new Map();
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
