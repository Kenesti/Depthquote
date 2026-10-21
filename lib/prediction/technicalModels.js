/**
 * Technical Analysis-Based Prediction Models Module
 * Implements prediction methods based on technical indicators
 */

const { PREDICTION_METHODS } = require('../../config/constants');

class TechnicalModels {
  constructor() {
    // This module uses technical indicators for prediction
  }

  /**
   * Moving Average Crossover prediction
   * @param {Array} data - OHLCV data with indicators
   * @param {object} options - Crossover options
   * @returns {object} Prediction results
   */
  movingAverageCrossover(data, options = {}) {
    const {
      fastPeriod = 12,
      slowPeriod = 26,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < slowPeriod) {
      return this._createEmptyResult('moving_average_crossover', forecastHorizon);
    }

    // Calculate moving averages
    const fastMA = this._calculateSMA(data.map(b => b.close), fastPeriod);
    const slowMA = this._calculateSMA(data.map(b => b.close), slowPeriod);

    // Find the most recent crossover
    let lastCrossover = null;
    let crossoverType = null;

    for (let i = Math.max(fastPeriod, slowPeriod); i < data.length; i++) {
      const prevFast = fastMA[i - 1];
      const prevSlow = slowMA[i - 1];
      const currFast = fastMA[i];
      const currSlow = slowMA[i];

      if (prevFast <= prevSlow && currFast > currSlow) {
        lastCrossover = i;
        crossoverType = 'golden_cross'; // Bullish
      } else if (prevFast >= prevSlow && currFast < currSlow) {
        lastCrossover = i;
        crossoverType = 'death_cross'; // Bearish
      }
    }

    // Generate predictions based on crossover
    const predictions = [];
    const lastClose = data[data.length - 1].close;

    if (!lastCrossover) {
      // No crossover found, use last price
      for (let i = 0; i < forecastHorizon; i++) {
        predictions.push(lastClose);
      }
    } else {
      // Predict based on crossover type
      const crossoverBar = data[lastCrossover];
      const trendStrength = this._calculateTrendStrength(data, lastCrossover);

      for (let i = 0; i < forecastHorizon; i++) {
        if (crossoverType === 'golden_cross') {
          // Bullish prediction
          const increase = lastClose * 0.01 * trendStrength; // 1% * strength
          predictions.push(lastClose + increase * (i + 1));
        } else {
          // Bearish prediction
          const decrease = lastClose * 0.01 * trendStrength; // 1% * strength
          predictions.push(lastClose - decrease * (i + 1));
        }
      }
    }

    return {
      method: 'moving_average_crossover',
      type: 'technical',
      parameters: { fastPeriod, slowPeriod },
      crossoverType: crossoverType,
      lastCrossover: lastCrossover,
      predictions: predictions,
      modelSummary: {
        fastPeriod: fastPeriod,
        slowPeriod: slowPeriod,
        crossoverType: crossoverType,
        trendStrength: this._calculateTrendStrength(data, lastCrossover)
      }
    };
  }

  /**
   * Bollinger Band Width prediction
   * @param {Array} data - OHLCV data with indicators
   * @param {object} options - Bollinger Band options
   * @returns {object} Prediction results
   */
  bollingerBandWidth(data, options = {}) {
    const {
      period = 20,
      stdDev = 2,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < period) {
      return this._createEmptyResult('bollinger_band_width', forecastHorizon);
    }

    // Calculate Bollinger Bands
    const bbData = this._calculateBollingerBands(data.map(b => b.close), period, stdDev);

    // Check current position relative to bands
    const lastClose = data[data.length - 1].close;
    const lastBB = bbData[bbData.length - 1];

    let position = 'middle';
    if (lastClose >= lastBB.upper) {
      position = 'above_upper';
    } else if (lastClose <= lastBB.lower) {
      position = 'below_lower';
    } else if (lastClose > lastBB.middle) {
      position = 'above_middle';
    } else {
      position = 'below_middle';
    }

    // Generate predictions based on position
    const predictions = [];
    const bandWidth = lastBB.upper - lastBB.lower;

    for (let i = 0; i < forecastHorizon; i++) {
      switch (position) {
        case 'above_upper':
          // Price above upper band, expect mean reversion
          predictions.push(lastClose - bandWidth * 0.1);
          break;
        case 'below_lower':
          // Price below lower band, expect mean reversion
          predictions.push(lastClose + bandWidth * 0.1);
          break;
        case 'above_middle':
          // Price above middle, expect to move toward upper band
          predictions.push(lastClose + bandWidth * 0.05);
          break;
        case 'below_middle':
          // Price below middle, expect to move toward lower band
          predictions.push(lastClose - bandWidth * 0.05);
          break;
        default:
          // At middle, expect to continue in current direction
          const trend = this._calculateTrend(data, 5);
          predictions.push(lastClose + trend * 0.01);
      }
    }

    return {
      method: 'bollinger_band_width',
      type: 'technical',
      parameters: { period, stdDev },
      position: position,
      predictions: predictions,
      modelSummary: {
        period: period,
        stdDev: stdDev,
        position: position,
        bandWidth: bandWidth
      }
    };
  }

  /**
   * RSI Divergence prediction
   * @param {Array} data - OHLCV data with RSI
   * @param {object} options - RSI Divergence options
   * @returns {object} Prediction results
   */
  rsiDivergence(data, options = {}) {
    const {
      rsiPeriod = 14,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < rsiPeriod * 2) {
      return this._createEmptyResult('rsi_divergence', forecastHorizon);
    }

    // Calculate RSI
    const rsiData = this._calculateRSI(data.map(b => b.close), rsiPeriod);

    // Check for divergence
    const { divergenceType, strength } = this._checkRSIDivergence(data, rsiData);

    // Generate predictions based on divergence
    const predictions = [];
    const lastClose = data[data.length - 1].close;

    for (let i = 0; i < forecastHorizon; i++) {
      if (divergenceType === 'bullish') {
        // Bullish divergence, expect price to rise
        predictions.push(lastClose * (1 + 0.01 * strength));
      } else if (divergenceType === 'bearish') {
        // Bearish divergence, expect price to fall
        predictions.push(lastClose * (1 - 0.01 * strength));
      } else {
        // No divergence, use last price
        predictions.push(lastClose);
      }
    }

    return {
      method: 'rsi_divergence',
      type: 'technical',
      parameters: { rsiPeriod },
      divergenceType: divergenceType,
      divergenceStrength: strength,
      predictions: predictions,
      modelSummary: {
        rsiPeriod: rsiPeriod,
        divergenceType: divergenceType,
        strength: strength
      }
    };
  }

  /**
   * MACD Histogram prediction
   * @param {Array} data - OHLCV data with MACD
   * @param {object} options - MACD options
   * @returns {object} Prediction results
   */
  macdHistogram(data, options = {}) {
    const {
      fastPeriod = 12,
      slowPeriod = 26,
      signalPeriod = 9,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < slowPeriod) {
      return this._createEmptyResult('macd_histogram', forecastHorizon);
    }

    // Calculate MACD
    const macdData = this._calculateMACD(
      data.map(b => b.close),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );

    // Check histogram trend
    const histogram = macdData.map(m => m.histogram || 0);
    const histogramTrend = this._calculateTrend(histogram.slice(-5), 5);

    // Check for crossovers
    const lastMACD = macdData[macdData.length - 1];
    const prevMACD = macdData[macdData.length - 2];

    let signal = 'neutral';
    if (prevMACD && lastMACD) {
      if (prevMACD.macd <= prevMACD.signal && lastMACD.macd > lastMACD.signal) {
        signal = 'bullish_crossover';
      } else if (prevMACD.macd >= prevMACD.signal && lastMACD.macd < lastMACD.signal) {
        signal = 'bearish_crossover';
      }
    }

    // Generate predictions
    const predictions = [];
    const lastClose = data[data.length - 1].close;

    for (let i = 0; i < forecastHorizon; i++) {
      switch (signal) {
        case 'bullish_crossover':
          predictions.push(lastClose * 1.01); // 1% increase
          break;
        case 'bearish_crossover':
          predictions.push(lastClose * 0.99); // 1% decrease
          break;
        default:
          // Use histogram trend
          const change = lastClose * 0.005 * histogramTrend; // 0.5% * trend
          predictions.push(lastClose + change);
      }
    }

    return {
      method: 'macd_histogram',
      type: 'technical',
      parameters: { fastPeriod, slowPeriod, signalPeriod },
      signal: signal,
      histogramTrend: histogramTrend,
      predictions: predictions,
      modelSummary: {
        fastPeriod: fastPeriod,
        slowPeriod: slowPeriod,
        signalPeriod: signalPeriod,
        signal: signal,
        histogramTrend: histogramTrend
      }
    };
  }

  /**
   * Support and Resistance prediction
   * @param {Array} data - OHLCV data
   * @param {object} options - Support/Resistance options
   * @returns {object} Prediction results
   */
  supportResistance(data, options = {}) {
    const {
      lookbackPeriod = 20,
      forecastHorizon = 1,
      tolerance = 0.01 // 1% tolerance for support/resistance levels
    } = options;

    if (!Array.isArray(data) || data.length < lookbackPeriod) {
      return this._createEmptyResult('support_resistance', forecastHorizon);
    }

    // Find support and resistance levels
    const levels = this._findSupportResistanceLevels(data.slice(-lookbackPeriod), tolerance);

    // Determine current position
    const lastClose = data[data.length - 1].close;
    const currentLevel = this._findCurrentLevel(lastClose, levels, tolerance);

    // Check for breakout
    const breakout = this._checkBreakout(data, levels, tolerance);

    // Generate predictions
    const predictions = [];

    for (let i = 0; i < forecastHorizon; i++) {
      if (breakout) {
        // Breakout occurred, predict continuation
        const direction = breakout.direction;
        const strength = breakout.strength;
        const change = lastClose * 0.01 * strength * (direction === 'up' ? 1 : -1);
        predictions.push(lastClose + change);
      } else if (currentLevel) {
        // Near a level, predict mean reversion
        const levelValue = currentLevel.value;
        const direction = lastClose > levelValue ? 'down' : 'up';
        const distance = Math.abs(lastClose - levelValue);
        const change = distance * 0.3 * (direction === 'up' ? 1 : -1);
        predictions.push(lastClose + change);
      } else {
        // No clear signal, use last price
        predictions.push(lastClose);
      }
    }

    return {
      method: 'support_resistance',
      type: 'technical',
      parameters: { lookbackPeriod, tolerance },
      levels: levels,
      currentLevel: currentLevel,
      breakout: breakout,
      predictions: predictions,
      modelSummary: {
        lookbackPeriod: lookbackPeriod,
        tolerance: tolerance,
        levelCount: levels.length,
        breakout: breakout
      }
    };
  }

  /**
   * Volume-based prediction
   * @param {Array} data - OHLCV data
   * @param {object} options - Volume options
   * @returns {object} Prediction results
   */
  volumeBased(data, options = {}) {
    const {
      lookbackPeriod = 20,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < lookbackPeriod) {
      return this._createEmptyResult('volume_based', forecastHorizon);
    }

    // Calculate volume statistics
    const volumes = data.slice(-lookbackPeriod).map(b => b.volume);
    const avgVolume = volumes.reduce((sum, val) => sum + val, 0) / volumes.length;
    const lastVolume = data[data.length - 1].volume;
    const volumeRatio = lastVolume / (avgVolume || 1);

    // Calculate price change with volume
    const priceChanges = data.slice(-lookbackPeriod).map((bar, i, arr) => {
      if (i === 0) return 0;
      return (bar.close - arr[i - 1].close) / arr[i - 1].close;
    });

    const volumeWeightedChange = priceChanges.reduce((sum, change, i) => {
      if (i === 0) return sum;
      return sum + change * volumes[i];
    }, 0) / volumes.reduce((sum, vol, i) => i === 0 ? sum : sum + vol, 0);

    // Determine volume signal
    let volumeSignal = 'neutral';
    if (volumeRatio > 1.5) {
      volumeSignal = lastVolume > avgVolume ? 'high_bullish' : 'high_bearish';
    } else if (volumeRatio < 0.5) {
      volumeSignal = 'low';
    }

    // Generate predictions
    const predictions = [];
    const lastClose = data[data.length - 1].close;

    for (let i = 0; i < forecastHorizon; i++) {
      switch (volumeSignal) {
        case 'high_bullish':
          predictions.push(lastClose * (1 + volumeWeightedChange));
          break;
        case 'high_bearish':
          predictions.push(lastClose * (1 - volumeWeightedChange));
          break;
        default:
          predictions.push(lastClose * (1 + volumeWeightedChange * 0.5));
      }
    }

    return {
      method: 'volume_based',
      type: 'technical',
      parameters: { lookbackPeriod },
      volumeSignal: volumeSignal,
      volumeRatio: volumeRatio,
      volumeWeightedChange: volumeWeightedChange,
      predictions: predictions,
      modelSummary: {
        lookbackPeriod: lookbackPeriod,
        volumeSignal: volumeSignal,
        volumeRatio: volumeRatio,
        volumeWeightedChange: volumeWeightedChange
      }
    };
  }

  // Helper methods

  /**
   * Create empty result object
   */
  _createEmptyResult(method, forecastHorizon) {
    return {
      method: method,
      type: 'technical',
      predictions: new Array(forecastHorizon).fill(null),
      modelSummary: {}
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  _calculateSMA(values, period) {
    return values.map((val, index) => {
      if (index < period - 1) {
        return null;
      }
      const window = values.slice(index - period + 1, index + 1);
      return window.reduce((sum, v) => sum + v, 0) / period;
    });
  }

  /**
   * Calculate Bollinger Bands
   */
  _calculateBollingerBands(values, period, stdDev) {
    return values.map((val, index) => {
      if (index < period - 1) {
        return { upper: null, middle: null, lower: null };
      }

      const window = values.slice(index - period + 1, index + 1);
      const mean = window.reduce((sum, v) => sum + v, 0) / period;

      const squaredDiffs = window.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / period;
      const std = Math.sqrt(variance);

      return {
        upper: mean + std * stdDev,
        middle: mean,
        lower: mean - std * stdDev
      };
    });
  }

  /**
   * Calculate RSI
   */
  _calculateRSI(values, period) {
    return values.map((val, index) => {
      if (index < period) {
        return null;
      }

      let gainSum = 0;
      let lossSum = 0;

      for (let i = index - period + 1; i <= index; i++) {
        const change = values[i] - values[i - 1];
        if (change > 0) {
          gainSum += change;
        } else {
          lossSum += Math.abs(change);
        }
      }

      const avgGain = gainSum / period;
      const avgLoss = lossSum / period;

      if (avgLoss === 0) {
        return 100;
      }

      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    });
  }

  /**
   * Calculate MACD
   */
  _calculateMACD(values, fastPeriod, slowPeriod, signalPeriod) {
    const fastEMA = this._calculateEMA(values, fastPeriod);
    const slowEMA = this._calculateEMA(values, slowPeriod);

    const macdLine = values.map((val, index) => {
      if (index < slowPeriod - 1) {
        return null;
      }
      return (fastEMA[index] || 0) - (slowEMA[index] || 0);
    });

    const signalLine = this._calculateEMA(macdLine, signalPeriod);

    return values.map((val, index) => ({
      macd: macdLine[index],
      signal: signalLine[index],
      histogram: macdLine[index] !== null && signalLine[index] !== null ?
        macdLine[index] - signalLine[index] : null
    }));
  }

  /**
   * Calculate EMA
   */
  _calculateEMA(values, period) {
    if (period <= 0 || values.length < period) {
      return values.map(() => null);
    }

    const multiplier = 2 / (period + 1);
    const result = new Array(values.length).fill(null);

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    result[period - 1] = sum / period;

    // EMA for remaining values
    for (let i = period; i < values.length; i++) {
      result[i] = (values[i] - result[i - 1]) * multiplier + result[i - 1];
    }

    return result;
  }

  /**
   * Calculate trend strength
   */
  _calculateTrendStrength(data, startIndex) {
    if (!startIndex || startIndex < 0 || startIndex >= data.length) {
      startIndex = Math.max(0, data.length - 20);
    }

    const window = data.slice(startIndex);
    const closes = window.map(b => b.close);
    const n = closes.length;

    if (n < 2) {
      return 0;
    }

    // Calculate linear regression slope
    const x = window.map((_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = closes.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * closes[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Normalize slope to 0-1 range based on recent volatility
    const volatility = this._calculateVolatility(closes);
    const normalizedSlope = slope / (volatility || 1);

    return Math.min(1, Math.max(0, Math.abs(normalizedSlope)));
  }

  /**
   * Calculate trend
   */
  _calculateTrend(data, period) {
    if (!Array.isArray(data) || data.length < period) {
      return 0;
    }

    const values = Array.isArray(data) ? data : data.map(b => b.close);
    const n = Math.min(period, values.length);
    const recent = values.slice(-n);

    if (recent.length < 2) {
      return 0;
    }

    const last = recent[recent.length - 1];
    const first = recent[0];
    return (last - first) / first;
  }

  /**
   * Calculate volatility
   */
  _calculateVolatility(values) {
    if (values.length < 2) {
      return 0;
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Check for RSI divergence
   */
  _checkRSIDivergence(data, rsiData) {
    if (data.length < 14 || rsiData.length < 14) {
      return { divergenceType: null, strength: 0 };
    }

    // Look for divergence in the last 14 bars
    const windowSize = 14;
    const priceWindow = data.slice(-windowSize);
    const rsiWindow = rsiData.slice(-windowSize);

    // Find local highs and lows in price
    const priceHighs = this._findLocalExtrema(priceWindow.map(b => b.close), 'max');
    const priceLows = this._findLocalExtrema(priceWindow.map(b => b.close), 'min');

    // Find local highs and lows in RSI
    const rsiHighs = this._findLocalExtrema(rsiWindow, 'max');
    const rsiLows = this._findLocalExtrema(rsiWindow, 'min');

    // Check for bullish divergence (price lower low, RSI higher low)
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastRSILow = rsiLows[rsiLows.length - 1];
      const prevRSILow = rsiLows[rsiLows.length - 2];

      if (lastPriceLow.value < prevPriceLow.value && lastRSILow.value > prevRSILow.value) {
        const strength = Math.min(
          1,
          (prevPriceLow.value - lastPriceLow.value) / prevPriceLow.value * 2
        );
        return { divergenceType: 'bullish', strength: strength };
      }
    }

    // Check for bearish divergence (price higher high, RSI lower high)
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastRSIHigh = rsiHighs[rsiHighs.length - 1];
      const prevRSIHigh = rsiHighs[rsiHighs.length - 2];

      if (lastPriceHigh.value > prevPriceHigh.value && lastRSIHigh.value < prevRSIHigh.value) {
        const strength = Math.min(
          1,
          (lastPriceHigh.value - prevPriceHigh.value) / prevPriceHigh.value * 2
        );
        return { divergenceType: 'bearish', strength: strength };
      }
    }

    return { divergenceType: null, strength: 0 };
  }

  /**
   * Find local extrema
   */
  _findLocalExtrema(values, type) {
    const extrema = [];
    const windowSize = 2;

    for (let i = windowSize; i < values.length - windowSize; i++) {
      const current = values[i];
      const neighbors = [];

      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i) {
          neighbors.push(values[j]);
        }
      }

      let isExtremum = false;
      if (type === 'max') {
        isExtremum = neighbors.every(n => current >= n);
      } else {
        isExtremum = neighbors.every(n => current <= n);
      }

      if (isExtremum) {
        extrema.push({
          index: i,
          value: current
        });
      }
    }

    return extrema;
  }

  /**
   * Find support and resistance levels
   */
  _findSupportResistanceLevels(data, tolerance) {
    const levels = [];
    const highs = data.map(b => b.high);
    const lows = data.map(b => b.low);

    // Find clusters in highs and lows
    const highClusters = this._findClusters(highs, tolerance);
    const lowClusters = this._findClusters(lows, tolerance);

    // Add high clusters as resistance levels
    highClusters.forEach(cluster => {
      levels.push({
        type: 'resistance',
        value: cluster.average,
        count: cluster.count,
        strength: cluster.count / data.length
      });
    });

    // Add low clusters as support levels
    lowClusters.forEach(cluster => {
      levels.push({
        type: 'support',
        value: cluster.average,
        count: cluster.count,
        strength: cluster.count / data.length
      });
    });

    // Sort by strength
    levels.sort((a, b) => b.strength - a.strength);

    return levels;
  }

  /**
   * Find clusters in values
   */
  _findClusters(values, tolerance) {
    const clusters = [];
    const sorted = [...values].sort((a, b) => a - b);

    for (const value of sorted) {
      let found = false;

      for (const cluster of clusters) {
        if (Math.abs(value - cluster.average) <= cluster.average * tolerance) {
          cluster.values.push(value);
          cluster.count++;
          cluster.sum += value;
          cluster.average = cluster.sum / cluster.count;
          found = true;
          break;
        }
      }

      if (!found) {
        clusters.push({
          values: [value],
          count: 1,
          sum: value,
          average: value
        });
      }
    }

    // Filter out small clusters
    return clusters.filter(c => c.count >= 2);
  }

  /**
   * Find current level
   */
  _findCurrentLevel(price, levels, tolerance) {
    for (const level of levels) {
      if (Math.abs(price - level.value) <= level.value * tolerance) {
        return level;
      }
    }
    return null;
  }

  /**
   * Check for breakout
   */
  _checkBreakout(data, levels, tolerance) {
    if (data.length < 2 || levels.length === 0) {
      return null;
    }

    const lastBar = data[data.length - 1];
    const prevBar = data[data.length - 2];

    // Check if price crossed any level
    for (const level of levels) {
      const prevBelow = prevBar.close < level.value * (1 - tolerance);
      const prevAbove = prevBar.close > level.value * (1 + tolerance);
      const currBelow = lastBar.close < level.value * (1 - tolerance);
      const currAbove = lastBar.close > level.value * (1 + tolerance);

      if (prevBelow && currAbove) {
        return {
          direction: 'up',
          level: level,
          strength: level.strength
        };
      }

      if (prevAbove && currBelow) {
        return {
          direction: 'down',
          level: level,
          strength: level.strength
        };
      }
    }

    return null;
  }

  /**
   * Get list of available technical models
   * @returns {Array} Available model names
   */
  getAvailableModels() {
    return PREDICTION_METHODS.TECHNICAL;
  }
}

module.exports = new TechnicalModels();
