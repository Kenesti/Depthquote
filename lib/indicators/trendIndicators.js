/**
 * Trend Indicators Module for Depthquote
 * Contains all trend-following technical indicators
 */

class TrendIndicators {
  constructor() {}

  /**
   * Simple Moving Average (SMA)
   */
  sma(data, period = 20, source = 'close') {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, sma: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, sma: null };
      }
      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const sum = values.reduce((acc, val) => acc + val, 0);
      return { ...bar, sma: sum / period };
    });
  }

  /**
   * Exponential Moving Average (EMA)
   */
  ema(data, period = 20, source = 'close') {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, ema: null }));
    }

    const smaData = this.sma(data, period, source);
    const multiplier = 2 / (period + 1);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, ema: null };
      }
      if (index === period - 1) {
        return { ...bar, ema: smaData[index].sma };
      }
      const prevEma = smaData[index - 1].ema;
      const currentPrice = this._getPrice(bar, source);
      return { ...bar, ema: (currentPrice - prevEma) * multiplier + prevEma };
    });
  }

  /**
   * Weighted Moving Average (WMA)
   */
  wma(data, period = 20, source = 'close') {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, wma: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, wma: null };
      }
      const window = data.slice(index - period + 1, index + 1);
      let sum = 0;
      let weightSum = 0;
      for (let i = 0; i < period; i++) {
        const weight = period - i;
        sum += this._getPrice(window[i], source) * weight;
        weightSum += weight;
      }
      return { ...bar, wma: sum / weightSum };
    });
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, source = 'close') {
    if (data.length < slowPeriod) {
      return data.map(bar => ({ ...bar, macd: null, signal: null, histogram: null }));
    }

    const fastEma = this.ema(data, fastPeriod, source);
    const slowEma = this.ema(data, slowPeriod, source);

    let signalLine = [];
    return data.map((bar, index) => {
      const macd = fastEma[index] && slowEma[index] ? fastEma[index].ema - slowEma[index].ema : null;
      
      if (index === 0) {
        signalLine[0] = null;
      } else if (signalLine.length > 0) {
        const prevSignal = signalLine[signalLine.length - 1];
        signalLine[index] = prevSignal !== null ? (macd - prevSignal) * (2 / (signalPeriod + 1)) + prevSignal : null;
      } else {
        signalLine[index] = null;
      }

      const signal = signalLine[index];
      const histogram = macd !== null && signal !== null ? macd - signal : null;

      return { ...bar, macd: macd, signal: signal, histogram: histogram };
    });
  }

  /**
   * Average Directional Index (ADX)
   */
  adx(data, period = 14) {
    if (data.length < period + 1) {
      return data.map(bar => ({ ...bar, adx: null, plusDI: null, minusDI: null }));
    }

    let prevHigh = null;
    let prevLow = null;
    let prevClose = null;

    return data.map((bar, index) => {
      const high = bar.high || 0;
      const low = bar.low || 0;
      const close = bar.close || 0;

      if (index === 0) {
        prevHigh = high;
        prevLow = low;
        prevClose = close;
        return { ...bar, adx: null, plusDI: null, minusDI: null };
      }

      const plusDM = high - (prevHigh || high) > (prevLow || low) - low ?
        Math.max(high - (prevHigh || high), 0) : 0;
      const minusDM = (prevLow || low) - low > high - (prevHigh || high) ?
        Math.max((prevLow || low) - low, 0) : 0;

      const tr = Math.max(
        high - low,
        Math.abs(high - (prevClose || close)),
        Math.abs(low - (prevClose || close))
      );

      prevHigh = high;
      prevLow = low;
      prevClose = close;

      if (index < period) {
        return { ...bar, adx: null, plusDI: null, minusDI: null, plusDM, minusDM, tr };
      }

      const window = data.slice(index - period + 1, index + 1);
      const smoothPlusDM = window.reduce((sum, b) => sum + (b.plusDM || 0), 0) / period;
      const smoothMinusDM = window.reduce((sum, b) => sum + (b.minusDM || 0), 0) / period;
      const smoothTR = window.reduce((sum, b) => sum + (b.tr || 0), 0) / period;

      const plusDI = (smoothPlusDM / smoothTR) * 100;
      const minusDI = (smoothMinusDM / smoothTR) * 100;
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

      const adxWindow = data.slice(Math.max(0, index - period - period + 2), index + 1);
      const adx = adxWindow.reduce((sum, b) => sum + (b.dx || 0), 0) / Math.min(period, adxWindow.length);

      return { ...bar, adx: adx, plusDI: plusDI, minusDI: minusDI, plusDM, minusDM, tr, dx };
    });
  }

  /**
   * Bollinger Bands
   */
  bollingerBands(data, period = 20, stdDev = 2, source = 'close') {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, upperBand: null, middleBand: null, lowerBand: null, bbWidth: null, percentB: null }));
    }

    const smaData = this.sma(data, period, source);

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, upperBand: null, middleBand: null, lowerBand: null, bbWidth: null, percentB: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const values = window.map(b => this._getPrice(b, source));
      const mean = smaData[index].sma;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
      const std = Math.sqrt(variance) * stdDev;

      const upperBand = mean + std;
      const lowerBand = mean - std;
      const bbWidth = upperBand - lowerBand;
      const percentB = mean !== lowerBand ? (bar.close - lowerBand) / bbWidth : 0;

      return { ...bar, upperBand, middleBand: mean, lowerBand, bbWidth, percentB };
    });
  }

  /**
   * Ichimoku Cloud
   */
  ichimoku(data, tenkanPeriod = 9, kijunPeriod = 26, senkouSpanBPeriod = 52) {
    if (data.length < Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod)) {
      return data.map(bar => ({ ...bar, tenkanSen: null, kijunSen: null, senkouSpanA: null, senkouSpanB: null, chikouSpan: null }));
    }

    return data.map((bar, index) => {
      const tenkanHigh = data.slice(Math.max(0, index - tenkanPeriod + 1), index + 1)
        .reduce((max, b) => Math.max(max, b.high || 0), 0);
      const tenkanLow = data.slice(Math.max(0, index - tenkanPeriod + 1), index + 1)
        .reduce((min, b) => Math.min(min, b.low || Infinity), Infinity);
      const tenkanSen = (tenkanHigh + tenkanLow) / 2;

      const kijunHigh = data.slice(Math.max(0, index - kijunPeriod + 1), index + 1)
        .reduce((max, b) => Math.max(max, b.high || 0), 0);
      const kijunLow = data.slice(Math.max(0, index - kijunPeriod + 1), index + 1)
        .reduce((min, b) => Math.min(min, b.low || Infinity), Infinity);
      const kijunSen = (kijunHigh + kijunLow) / 2;

      const senkouAHigh = data.slice(Math.max(0, index - tenkanPeriod + 1), index + 1)
        .reduce((max, b) => Math.max(max, b.high || 0), 0);
      const senkouALow = data.slice(Math.max(0, index - tenkanPeriod + 1), index + 1)
        .reduce((min, b) => Math.min(min, b.low || Infinity), Infinity);
      const senkouSpanA = (senkouAHigh + senkouALow) / 2;

      const senkouBHigh = data.slice(Math.max(0, index - senkouSpanBPeriod + 1), index + 1)
        .reduce((max, b) => Math.max(max, b.high || 0), 0);
      const senkouBLow = data.slice(Math.max(0, index - senkouSpanBPeriod + 1), index + 1)
        .reduce((min, b) => Math.min(min, b.low || Infinity), Infinity);
      const senkouSpanB = (senkouBHigh + senkouBLow) / 2;

      const chikouClose = index >= kijunPeriod - 1 ? data[index - kijunPeriod + 1].close : null;

      return { ...bar, tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan: chikouClose };
    });
  }

  /**
   * Parabolic SAR
   */
  parabolicSAR(data, acceleration = 0.02, maximum = 0.2) {
    if (data.length === 0) return data.map(bar => ({ ...bar, sar: null }));

    let sar = data[0].low;
    let ep = data[0].high;
    let af = acceleration;
    let trend = 1; // 1 = uptrend, -1 = downtrend

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, sar: bar.low, sarTrend: null };
      }

      let newSar = sar + af * (ep - sar);
      let newTrend = trend;
      let newEp = ep;

      if (trend === 1) {
        if (bar.high > ep) {
          newEp = bar.high;
          newAf = Math.min(af + acceleration, maximum);
        }
        if (newSar > bar.low) {
          newTrend = -1;
          newSar = ep;
          newEp = bar.low;
          newAf = acceleration;
        }
      } else {
        if (bar.low < ep) {
          newEp = bar.low;
          newAf = Math.min(af + acceleration, maximum);
        }
        if (newSar < bar.high) {
          newTrend = 1;
          newSar = ep;
          newEp = bar.high;
          newAf = acceleration;
        }
      }

      sar = newSar;
      ep = newEp;
      af = newAf;
      trend = newTrend;

      return { ...bar, sar: sar, sarTrend: trend === 1 ? 'uptrend' : 'downtrend' };
    });
  }

  /**
   * Supertrend
   */
  supertrend(data, period = 10, multiplier = 3, source = 'close') {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, supertrend: null, direction: null }));
    }

    const atrData = this.atr(data, period);

    let upperBand = null;
    let lowerBand = null;
    let supertrendValue = null;
    let direction = null;

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, supertrend: null, direction: null };
      }

      const atr = atrData[index].atr || 0;
      const hl2 = (bar.high + bar.low) / 2;

      if (index === period - 1) {
        upperBand = hl2 + (multiplier * atr);
        lowerBand = hl2 - (multiplier * atr);
        supertrendValue = upperBand;
        direction = bar.close > upperBand ? -1 : 1;
      } else {
        const prevUpper = upperBand;
        const prevLower = lowerBand;
        const prevClose = data[index - 1].close;
        const prevST = supertrendValue;

        upperBand = Math.max(hl2 + (multiplier * atr), Math.min(prevUpper, prevClose));
        lowerBand = Math.min(hl2 - (multiplier * atr), Math.max(prevLower, prevClose));

        if (direction === 1) {
          supertrendValue = Math.min(upperBand, prevClose);
          if (bar.close < supertrendValue) {
            direction = -1;
            supertrendValue = lowerBand;
          }
        } else {
          supertrendValue = Math.max(lowerBand, prevClose);
          if (bar.close > supertrendValue) {
            direction = 1;
            supertrendValue = upperBand;
          }
        }
      }

      return { ...bar, supertrend: supertrendValue, direction: direction === 1 ? 'up' : 'down' };
    });
  }

  /**
   * Average True Range (ATR)
   */
  atr(data, period = 14) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, atr: null, tr: null }));
    }

    let prevClose = data[0].close || 0;

    return data.map((bar, index) => {
      const high = bar.high || 0;
      const low = bar.low || 0;
      const close = bar.close || 0;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      prevClose = close;

      if (index < period - 1) {
        return { ...bar, atr: null, tr };
      }

      const window = data.slice(index - period + 1, index + 1);
      const atr = window.reduce((sum, b) => sum + (b.tr || 0), 0) / period;

      return { ...bar, atr, tr };
    });
  }

  /**
   * Calculate all trend indicators
   */
  async calculateAll(data, options = {}) {
    let processedData = data;

    processedData = this.sma(processedData, 20, options.source);
    processedData = this.ema(processedData, 20, options.source);
    processedData = this.wma(processedData, 20, options.source);
    processedData = this.macd(processedData, 12, 26, 9, options.source);
    processedData = this.adx(processedData, 14);
    processedData = this.bollingerBands(processedData, 20, 2, options.source);
    processedData = this.ichimoku(processedData);
    processedData = this.parabolicSAR(processedData);
    processedData = this.supertrend(processedData);
    processedData = this.atr(processedData, 14);

    return processedData;
  }

  /**
   * Calculate specific trend indicator
   */
  calculate(data, indicatorName, options = {}) {
    const normalizedName = indicatorName.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (normalizedName) {
      case 'sma':
        return this.sma(data, options.period || 20, options.source);
      case 'ema':
        return this.ema(data, options.period || 20, options.source);
      case 'wma':
        return this.wma(data, options.period || 20, options.source);
      case 'macd':
        return this.macd(data, options.fastPeriod || 12, options.slowPeriod || 26, options.signalPeriod || 9, options.source);
      case 'adx':
        return this.adx(data, options.period || 14);
      case 'bollinger':
      case 'bollingerbands':
        return this.bollingerBands(data, options.period || 20, options.stdDev || 2, options.source);
      case 'ichimoku':
        return this.ichimoku(data, options.tenkanPeriod || 9, options.kijunPeriod || 26, options.senkouSpanBPeriod || 52);
      case 'parabolicsar':
      case 'psar':
        return this.parabolicSAR(data, options.acceleration || 0.02, options.maximum || 0.2);
      case 'supertrend':
        return this.supertrend(data, options.period || 10, options.multiplier || 3, options.source);
      case 'atr':
        return this.atr(data, options.period || 14);
      default:
        console.warn(`Unknown trend indicator: ${indicatorName}`);
        return data;
    }
  }

  /**
   * Get available trend indicators
   */
  getAvailableIndicators() {
    return [
      'SMA', 'EMA', 'WMA', 'MACD', 'ADX',
      'Bollinger Bands', 'Ichimoku Cloud',
      'Parabolic SAR', 'Supertrend', 'ATR'
    ];
  }

  /**
   * Get price from bar based on source
   */
  _getPrice(bar, source = 'close') {
    switch (source.toLowerCase()) {
      case 'open': return bar.open || 0;
      case 'high': return bar.high || 0;
      case 'low': return bar.low || 0;
      case 'typical': return ((bar.high || 0) + (bar.low || 0) + (bar.close || 0)) / 3;
      default: return bar.close || 0;
    }
  }
}

// Export singleton instance
module.exports = new TrendIndicators();
