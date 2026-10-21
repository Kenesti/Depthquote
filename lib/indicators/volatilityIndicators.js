/**
 * Volatility Indicators Module
 * Contains all volatility-based technical indicators
 */

class VolatilityIndicators {
  constructor() {}

  /**
   * Average True Range (ATR)
   * @param {Array} data - OHLCV data
   * @param {number} period - ATR period
   * @returns {Array} Data with ATR values
   */
  atr(data, period = 14) {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, atr: null }));
    }

    // First, calculate True Range for each bar
    const trData = data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, tr: bar.high - bar.low };
      }

      const prev = data[index - 1];
      const tr = Math.max(
        bar.high - bar.low,
        Math.abs(bar.high - prev.close),
        Math.abs(bar.low - prev.close)
      );

      return { ...bar, tr: tr };
    });

    // Calculate ATR using Wilder's smoothing (EMA with multiplier 1/period)
    const multiplier = 1 / period;
    const atrValues = new Array(data.length).fill(null);

    // Initial ATR is SMA of first period TR values
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trData[i].tr;
    }
    atrValues[period - 1] = sum / period;

    // Calculate ATR for remaining bars
    for (let i = period; i < data.length; i++) {
      const currentTr = trData[i].tr;
      const prevAtr = atrValues[i - 1];
      atrValues[i] = (currentTr - prevAtr) * multiplier + prevAtr;
    }

    return data.map((bar, index) => ({
      ...bar,
      atr: atrValues[index],
      tr: trData[index].tr
    }));
  }

  /**
   * Bollinger Bands %B
   * @param {Array} data - OHLCV data
   * @param {object} options - Bollinger Bands %B options
   * @returns {Array} Data with %B values
   */
  bollingerBandsPercentB(data, options = {}) {
    const {
      period = 20,
      stdDev = 2,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, percentB: null }));
    }

    // Calculate SMA
    const sma = this._sma(data.map(b => this._getPrice(b, source)), period);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, percentB: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const mean = sma[index];

      // Calculate standard deviation
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
      const std = Math.sqrt(variance);

      const upperBand = mean + (std * stdDev);
      const lowerBand = mean - (std * stdDev);
      const currentPrice = this._getPrice(bar, source);

      const percentB = (currentPrice - lowerBand) / (upperBand - lowerBand);

      return {
        ...bar,
        percentB: percentB,
        bbUpper: upperBand,
        bbMiddle: mean,
        bbLower: lowerBand
      };
    });
  }

  /**
   * Bollinger Band Width
   * @param {Array} data - OHLCV data
   * @param {object} options - Bollinger Band Width options
   * @returns {Array} Data with BB Width values
   */
  bollingerBandWidth(data, options = {}) {
    const {
      period = 20,
      stdDev = 2,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, bbWidth: null }));
    }

    // Calculate SMA
    const sma = this._sma(data.map(b => this._getPrice(b, source)), period);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, bbWidth: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const mean = sma[index];

      // Calculate standard deviation
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
      const std = Math.sqrt(variance);

      const upperBand = mean + (std * stdDev);
      const lowerBand = mean - (std * stdDev);

      const bbWidth = (upperBand - lowerBand) / mean;

      return {
        ...bar,
        bbWidth: bbWidth
      };
    });
  }

  /**
   * Donchian Channels
   * @param {Array} data - OHLCV data
   * @param {number} period - Donchian Channels period
   * @returns {Array} Data with Donchian Channels values
   */
  donchianChannels(data, period = 20) {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, donchian: { upper: null, lower: null, middle: null } }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, donchian: { upper: null, lower: null, middle: null } };
      }

      const window = data.slice(index - period + 1, index + 1);
      const highs = window.map(b => b.high);
      const lows = window.map(b => b.low);

      const upper = Math.max(...highs);
      const lower = Math.min(...lows);
      const middle = (upper + lower) / 2;

      return {
        ...bar,
        donchian: {
          upper: upper,
          lower: lower,
          middle: middle,
          width: upper - lower
        }
      };
    });
  }

  /**
   * Keltner Channels
   * @param {Array} data - OHLCV data
   * @param {object} options - Keltner Channels options
   * @returns {Array} Data with Keltner Channels values
   */
  keltnerChannels(data, options = {}) {
    const {
      period = 20,
      atrPeriod = 10,
      multiplier = 2
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, keltner: { upper: null, middle: null, lower: null } }));
    }

    // Calculate EMA for middle line
    const ema = this._ema(data.map(b => b.close), period);

    // Calculate ATR
    const atrData = this.atr(data, atrPeriod);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, keltner: { upper: null, middle: null, lower: null } };
      }

      const middle = ema[index];
      const atr = atrData[index].atr || 0;

      const upper = middle + (atr * multiplier);
      const lower = middle - (atr * multiplier);

      return {
        ...bar,
        keltner: {
          upper: upper,
          middle: middle,
          lower: lower,
          width: upper - lower
        }
      };
    });
  }

  /**
   * Historical Volatility
   * @param {Array} data - OHLCV data
   * @param {object} options - Historical Volatility options
   * @returns {Array} Data with Historical Volatility values
   */
  historicalVolatility(data, options = {}) {
    const {
      period = 20,
      annualized = true,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, hv: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, hv: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));

      // Calculate log returns
      const logReturns = [];
      for (let i = 1; i < values.length; i++) {
        const ret = Math.log(values[i] / values[i - 1]);
        logReturns.push(ret);
      }

      // Calculate standard deviation of log returns
      const mean = logReturns.reduce((sum, val) => sum + val, 0) / logReturns.length;
      const squaredDiffs = logReturns.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / logReturns.length;
      const std = Math.sqrt(variance);

      // Annualize if requested (assuming 252 trading days in a year)
      const hv = annualized ? std * Math.sqrt(252) : std;

      return {
        ...bar,
        hv: hv,
        hvDaily: std
      };
    });
  }

  /**
   * Standard Deviation
   * @param {Array} data - OHLCV data
   * @param {object} options - Standard Deviation options
   * @returns {Array} Data with Standard Deviation values
   */
  standardDeviation(data, options = {}) {
    const {
      period = 20,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, stdDev: null }));
    }

    // Calculate SMA
    const sma = this._sma(data.map(b => this._getPrice(b, source)), period);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, stdDev: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const mean = sma[index];

      // Calculate standard deviation
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
      const std = Math.sqrt(variance);

      return {
        ...bar,
        stdDev: std
      };
    });
  }

  /**
   * Variance
   * @param {Array} data - OHLCV data
   * @param {object} options - Variance options
   * @returns {Array} Data with Variance values
   */
  variance(data, options = {}) {
    const {
      period = 20,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, variance: null }));
    }

    // Calculate SMA
    const sma = this._sma(data.map(b => this._getPrice(b, source)), period);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, variance: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const mean = sma[index];

      // Calculate variance
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;

      return {
        ...bar,
        variance: variance
      };
    });
  }

  /**
   * Beta
   * @param {Array} stockData - Stock OHLCV data
   * @param {Array} benchmarkData - Benchmark OHLCV data
   * @param {number} period - Beta calculation period
   * @returns {Array} Data with Beta values
   */
  beta(stockData, benchmarkData, period = 20) {
    if (period <= 0 || stockData.length < period || benchmarkData.length < period) {
      return stockData.map(bar => ({ ...bar, beta: null }));
    }

    // Align data by date
    const alignedData = this._alignDataByDate(stockData, benchmarkData);

    return alignedData.stock.map((bar, index) => {
      if (index < period - 1 || index >= alignedData.stock.length - 1) {
        return { ...bar, beta: null };
      }

      const window = alignedData.stock.slice(index - period + 1, index + 1);
      const benchmarkWindow = alignedData.benchmark.slice(index - period + 1, index + 1);

      // Calculate returns
      const stockReturns = this._calculateReturns(window, 'close');
      const benchmarkReturns = this._calculateReturns(benchmarkWindow, 'close');

      // Calculate covariance and variance
      const covariance = this._calculateCovariance(stockReturns, benchmarkReturns);
      const benchmarkVariance = this._calculateVariance(benchmarkReturns);

      const beta = covariance / (benchmarkVariance || 1);

      return {
        ...bar,
        beta: beta
      };
    });
  }

  /**
   * Alpha
   * @param {Array} stockData - Stock OHLCV data
   * @param {Array} benchmarkData - Benchmark OHLCV data
   * @param {number} riskFreeRate - Risk-free rate
   * @param {number} period - Alpha calculation period
   * @returns {Array} Data with Alpha values
   */
  alpha(stockData, benchmarkData, riskFreeRate = 0, period = 20) {
    if (period <= 0 || stockData.length < period || benchmarkData.length < period) {
      return stockData.map(bar => ({ ...bar, alpha: null }));
    }

    // First calculate beta
    const betaData = this.beta(stockData, benchmarkData, period);

    // Align data by date
    const alignedData = this._alignDataByDate(stockData, benchmarkData);

    return alignedData.stock.map((bar, index) => {
      if (index < period - 1 || index >= alignedData.stock.length - 1) {
        return { ...bar, alpha: null };
      }

      const window = alignedData.stock.slice(index - period + 1, index + 1);
      const benchmarkWindow = alignedData.benchmark.slice(index - period + 1, index + 1);

      // Calculate returns
      const stockReturns = this._calculateReturns(window, 'close');
      const benchmarkReturns = this._calculateReturns(benchmarkWindow, 'close');

      // Calculate average returns
      const avgStockReturn = stockReturns.reduce((sum, val) => sum + val, 0) / stockReturns.length;
      const avgBenchmarkReturn = benchmarkReturns.reduce((sum, val) => sum + val, 0) / benchmarkReturns.length;

      // Get beta for this period
      const currentBeta = betaData[index].beta || 0;

      // Calculate alpha: Alpha = Stock Return - [Risk-Free Rate + Beta * (Benchmark Return - Risk-Free Rate)]
      const alpha = avgStockReturn - (riskFreeRate + currentBeta * (avgBenchmarkReturn - riskFreeRate));

      return {
        ...bar,
        alpha: alpha
      };
    });
  }

  /**
   * Sharpe Ratio
   * @param {Array} data - OHLCV data
   * @param {object} options - Sharpe Ratio options
   * @returns {Array} Data with Sharpe Ratio values
   */
  sharpeRatio(data, options = {}) {
    const {
      period = 20,
      riskFreeRate = 0,
      annualized = true,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, sharpeRatio: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, sharpeRatio: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));

      // Calculate returns
      const returns = [];
      for (let i = 1; i < values.length; i++) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }

      // Calculate average return
      const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;

      // Calculate standard deviation of returns
      const squaredDiffs = returns.map(val => Math.pow(val - avgReturn, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / returns.length;
      const std = Math.sqrt(variance);

      // Calculate Sharpe Ratio
      const excessReturn = avgReturn - (riskFreeRate / 252); // Daily risk-free rate
      const sharpe = excessReturn / (std || 1);

      // Annualize if requested
      const annualizedSharpe = annualized ? sharpe * Math.sqrt(252) : sharpe;

      return {
        ...bar,
        sharpeRatio: annualizedSharpe,
        excessReturn: excessReturn,
        returnStd: std
      };
    });
  }

  /**
   * Sortino Ratio
   * @param {Array} data - OHLCV data
   * @param {object} options - Sortino Ratio options
   * @returns {Array} Data with Sortino Ratio values
   */
  sortinoRatio(data, options = {}) {
    const {
      period = 20,
      riskFreeRate = 0,
      targetReturn = 0,
      annualized = true,
      source = 'close'
    } = options;

    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, sortinoRatio: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, sortinoRatio: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));

      // Calculate returns
      const returns = [];
      for (let i = 1; i < values.length; i++) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }

      // Calculate average return
      const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;

      // Calculate downside deviation
      const downsideDiffs = returns.map(val => {
        const diff = val - targetReturn;
        return diff < 0 ? Math.pow(diff, 2) : 0;
      });
      const downsideVariance = downsideDiffs.reduce((sum, val) => sum + val, 0) / returns.length;
      const downsideDeviation = Math.sqrt(downsideVariance);

      // Calculate Sortino Ratio
      const excessReturn = avgReturn - (riskFreeRate / 252); // Daily risk-free rate
      const sortino = excessReturn / (downsideDeviation || 1);

      // Annualize if requested
      const annualizedSortino = annualized ? sortino * Math.sqrt(252) : sortino;

      return {
        ...bar,
        sortinoRatio: annualizedSortino,
        downsideDeviation: downsideDeviation
      };
    });
  }

  /**
   * Calculate EMA
   */
  _ema(values, period) {
    if (period <= 0 || values.length < period) {
      return values.map(() => null);
    }

    const multiplier = 2 / (period + 1);
    const result = new Array(values.length).fill(null);

    // Calculate initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i] || 0;
    }
    result[period - 1] = sum / period;

    // Calculate EMA for remaining data
    for (let i = period; i < values.length; i++) {
      const currentValue = values[i] || 0;
      const prevEma = result[i - 1] || 0;
      result[i] = (currentValue - prevEma) * multiplier + prevEma;
    }

    return result;
  }

  /**
   * Simple Moving Average
   */
  _sma(values, period) {
    return values.map((val, index) => {
      if (index < period - 1) {
        return null;
      }
      const window = values.slice(index - period + 1, index + 1);
      const validValues = window.filter(v => v !== null && !isNaN(v));
      if (validValues.length < period) {
        return null;
      }
      return validValues.reduce((sum, v) => sum + v, 0) / period;
    });
  }

  /**
   * Get price from bar based on source
   */
  _getPrice(bar, source) {
    switch (source.toLowerCase()) {
      case 'open': return bar.open;
      case 'high': return bar.high;
      case 'low': return bar.low;
      case 'typical': return (bar.high + bar.low + bar.close) / 3;
      default: return bar.close;
    }
  }

  /**
   * Align two datasets by date
   */
  _alignDataByDate(data1, data2) {
    const map1 = new Map(data1.map(bar => [bar.date, bar]));
    const map2 = new Map(data2.map(bar => [bar.date, bar]));

    const allDates = new Set([...map1.keys(), ...map2.keys()]);
    const sortedDates = Array.from(allDates).sort();

    const aligned1 = [];
    const aligned2 = [];

    for (const date of sortedDates) {
      if (map1.has(date)) {
        aligned1.push(map1.get(date));
      }
      if (map2.has(date)) {
        aligned2.push(map2.get(date));
      }
    }

    return { stock: aligned1, benchmark: aligned2 };
  }

  /**
   * Calculate returns from price series
   */
  _calculateReturns(data, source) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const current = this._getPrice(data[i], source);
      const previous = this._getPrice(data[i - 1], source);
      returns.push((current - previous) / previous);
    }
    return returns;
  }

  /**
   * Calculate covariance between two series
   */
  _calculateCovariance(series1, series2) {
    if (series1.length !== series2.length || series1.length === 0) {
      return 0;
    }

    const mean1 = series1.reduce((sum, val) => sum + val, 0) / series1.length;
    const mean2 = series2.reduce((sum, val) => sum + val, 0) / series2.length;

    let covariance = 0;
    for (let i = 0; i < series1.length; i++) {
      covariance += (series1[i] - mean1) * (series2[i] - mean2);
    }

    return covariance / series1.length;
  }

  /**
   * Calculate variance of a series
   */
  _calculateVariance(series) {
    if (series.length === 0) {
      return 0;
    }

    const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
    const squaredDiffs = series.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / series.length;
  }
}

module.exports = new VolatilityIndicators();
