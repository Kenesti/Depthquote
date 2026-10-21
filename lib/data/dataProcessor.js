/**
 * Data Processor Module for Depthquote
 * Processes and transforms OHLCV data
 */

class DataProcessor {
  constructor() {}

  /**
   * Process historical data from Yahoo Finance
   * @param {Array} historicalData - Raw historical data
   * @returns {Array} Processed data with calculated fields
   */
  processHistoricalData(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    // Sort by date (oldest first)
    const sortedData = [...historicalData].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    // Calculate additional fields
    return sortedData.map((bar, index) => ({
      ...bar,
      typicalPrice: this.calculateTypicalPrice(bar),
      priceChange: index > 0 ? bar.close - sortedData[index - 1].close : 0,
      priceChangePercent: index > 0 ? ((bar.close - sortedData[index - 1].close) / sortedData[index - 1].close) * 100 : 0
    }));
  }

  /**
   * Calculate typical price (average of high, low, close)
   */
  calculateTypicalPrice(bar) {
    if (!bar) return null;
    const sum = (bar.high || 0) + (bar.low || 0) + (bar.close || 0);
    return sum / 3;
  }

  /**
   * Calculate price changes
   */
  calculatePriceChanges(data) {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((bar, index) => ({
      ...bar,
      priceChange: index > 0 ? bar.close - data[index - 1].close : 0,
      priceChangePercent: index > 0 ? ((bar.close - data[index - 1].close) / data[index - 1].close) * 100 : 0
    }));
  }

  /**
   * Calculate simple returns
   */
  calculateReturns(data) {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((bar, index) => ({
      ...bar,
      simpleReturn: index > 0 ? (bar.close / data[index - 1].close) - 1 : 0,
      logReturn: index > 0 ? Math.log(bar.close / data[index - 1].close) : 0
    }));
  }

  /**
   * Calculate cumulative returns
   */
  calculateCumulativeReturns(data) {
    if (!data || data.length === 0) {
      return [];
    }

    let cumulativeSimple = 1;
    let cumulativeLog = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        return {
          ...bar,
          cumulativeSimpleReturn: 1,
          cumulativeLogReturn: 0
        };
      }

      cumulativeSimple *= (1 + bar.simpleReturn);
      cumulativeLog += bar.logReturn;

      return {
        ...bar,
        cumulativeSimpleReturn: cumulativeSimple,
        cumulativeLogReturn: cumulativeLog
      };
    });
  }

  /**
   * Normalize data
   */
  normalizeData(data, field = 'close') {
    if (!data || data.length === 0) {
      return [];
    }

    const values = data.map(bar => bar[field]).filter(v => v !== null && v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return data.map(bar => ({
      ...bar,
      normalized: range > 0 ? (bar[field] - min) / range : 0
    }));
  }

  /**
   * Create time series from data
   */
  createTimeSeries(data, valueField = 'close') {
    if (!data || data.length === 0) {
      return { dates: [], values: [] };
    }

    return {
      dates: data.map(bar => bar.date),
      values: data.map(bar => bar[valueField])
    };
  }

  /**
   * Create sliding windows
   */
  createWindows(data, windowSize) {
    if (!data || data.length < windowSize) {
      return [];
    }

    const windows = [];
    for (let i = 0; i <= data.length - windowSize; i++) {
      windows.push(data.slice(i, i + windowSize));
    }
    return windows;
  }

  /**
   * Calculate moving statistics
   */
  calculateMovingStats(data, windowSize, field = 'close') {
    if (!data || data.length < windowSize) {
      return data.map(bar => ({ ...bar, movingAvg: null, movingStd: null }));
    }

    return data.map((bar, index) => {
      if (index < windowSize - 1) {
        return { ...bar, movingAvg: null, movingStd: null };
      }

      const window = data.slice(index - windowSize + 1, index + 1);
      const values = window.map(b => b[field]).filter(v => v !== null);
      
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      return {
        ...bar,
        movingAvg: avg,
        movingStd: std
      };
    });
  }

  /**
   * Resample data to different timeframe
   */
  resampleData(data, newInterval) {
    if (!data || data.length === 0) {
      return [];
    }

    // Simple resampling - group by date
    const resampled = [];
    const dateGroups = {};

    data.forEach(bar => {
      const dateKey = this._getDateKey(bar.date, newInterval);
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: dateKey,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume
        };
      } else {
        dateGroups[dateKey].high = Math.max(dateGroups[dateKey].high, bar.high);
        dateGroups[dateKey].low = Math.min(dateGroups[dateKey].low, bar.low);
        dateGroups[dateKey].close = bar.close;
        dateGroups[dateKey].volume += bar.volume;
      }
    });

    return Object.values(dateGroups).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get date key for resampling
   */
  _getDateKey(date, interval) {
    const d = new Date(date);
    
    switch (interval) {
      case '1h':
      case '1d':
        return d.toISOString().split('T')[0];
      case '1wk':
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split('T')[0];
      case '1mo':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      default:
        return d.toISOString().split('T')[0];
    }
  }
}

// Export singleton instance
const dataProcessor = new DataProcessor();
module.exports = dataProcessor;
