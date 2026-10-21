/**
 * Momentum Indicators Module for Depthquote
 * Contains all momentum-based technical indicators
 */

class MomentumIndicators {
  constructor() {}

  /**
   * Relative Strength Index (RSI)
   */
  rsi(data, period = 14, source = 'close') {
    if (period <= 0 || data.length < period + 1) {
      return data.map(bar => ({ ...bar, rsi: null }));
    }

    let gainSum = 0;
    let lossSum = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, rsi: null };
      }

      const prevPrice = this._getPrice(data[index - 1], source);
      const currentPrice = this._getPrice(bar, source);
      const change = currentPrice - prevPrice;

      if (change > 0) {
        gainSum += change;
      } else {
        lossSum += Math.abs(change);
      }

      if (index < period) {
        return { ...bar, rsi: null };
      }

      if (index > period) {
        const oldest = data[index - period];
        const prevOldest = data[index - period - 1];
        const oldChange = this._getPrice(oldest, source) - this._getPrice(prevOldest, source);
        if (oldChange > 0) {
          gainSum -= oldChange;
        } else {
          lossSum -= Math.abs(oldChange);
        }
      }

      const avgGain = gainSum / period;
      const avgLoss = lossSum / period;
      let rs = avgGain / avgLoss;
      if (avgLoss === 0) {
        rs = avgGain > 0 ? Infinity : 0;
      }
      const rsi = 100 - (100 / (1 + rs));
      return { ...bar, rsi: Math.min(100, Math.max(0, rsi)) };
    });
  }

  /**
   * Stochastic Oscillator
   */
  stochastic(data, kPeriod = 14, dPeriod = 3, smoothK = 3, smoothD = 3) {
    if (data.length < Math.max(kPeriod, dPeriod, smoothK, smoothD) + 1) {
      return data.map(bar => ({ ...bar, stochasticK: null, stochasticD: null, slowK: null, slowD: null }));
    }

    return data.map((bar, index) => {
      if (index < kPeriod - 1) {
        return { ...bar, stochasticK: null, stochasticD: null, slowK: null, slowD: null };
      }

      const window = data.slice(index - kPeriod + 1, index + 1);
      const lows = window.map(b => b.low || 0);
      const highs = window.map(b => b.high || 0);
      const minLow = Math.min(...lows);
      const maxHigh = Math.max(...highs);
      const k = (bar.close - minLow) / (maxHigh - minLow) * 100;

      if (index < kPeriod + dPeriod - 2) {
        return { ...bar, stochasticK: k, stochasticD: null, slowK: null, slowD: null };
      }

      const dWindow = data.slice(index - dPeriod + 1, index + 1);
      const dValues = dWindow.map(b => b.stochasticK || 0).filter(v => v !== null);
      const d = dValues.reduce((sum, v) => sum + v, 0) / dValues.length;

      if (index < kPeriod + dPeriod + smoothK - 3) {
        return { ...bar, stochasticK: k, stochasticD: d, slowK: null, slowD: null };
      }

      const slowKWindow = data.slice(index - smoothK + 1, index + 1);
      const slowKValues = slowKWindow.map(b => b.stochasticK || 0).filter(v => v !== null);
      const slowK = slowKValues.reduce((sum, v) => sum + v, 0) / slowKValues.length;

      if (index < kPeriod + dPeriod + smoothK + smoothD - 4) {
        return { ...bar, stochasticK: k, stochasticD: d, slowK: slowK, slowD: null };
      }

      const slowDWindow = data.slice(index - smoothD + 1, index + 1);
      const slowDValues = slowDWindow.map(b => b.slowK || 0).filter(v => v !== null);
      const slowD = slowDValues.reduce((sum, v) => sum + v, 0) / slowDValues.length;

      return { ...bar, stochasticK: k, stochasticD: d, slowK: slowK, slowD: slowD };
    });
  }

  /**
   * Williams %R
   */
  williamsR(data, period = 14) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, williamsR: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, williamsR: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const highs = window.map(b => b.high || 0);
      const lows = window.map(b => b.low || 0);
      const maxHigh = Math.max(...highs);
      const minLow = Math.min(...lows);
      const williamsR = (maxHigh - (bar.close || 0)) / (maxHigh - minLow) * -100;

      return { ...bar, williamsR: williamsR };
    });
  }

  /**
   * Commodity Channel Index (CCI)
   */
  cci(data, period = 20) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, cci: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, cci: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const typicalPrices = window.map(b => ((b.high || 0) + (b.low || 0) + (b.close || 0)) / 3);
      const mean = typicalPrices.reduce((sum, v) => sum + v, 0) / period;
      const meanDeviation = typicalPrices.reduce((sum, v) => sum + Math.abs(v - mean), 0) / period;
      const cci = meanDeviation !== 0 ? ((bar.typicalPrice || 0) - mean) / (0.015 * meanDeviation) : 0;

      return { ...bar, cci: cci };
    });
  }

  /**
   * Rate of Change (ROC)
   */
  roc(data, period = 10, source = 'close') {
    if (data.length < period + 1) {
      return data.map(bar => ({ ...bar, roc: null }));
    }

    return data.map((bar, index) => {
      if (index < period) {
        return { ...bar, roc: null };
      }

      const prevPrice = this._getPrice(data[index - period], source);
      const currentPrice = this._getPrice(bar, source);
      const roc = ((currentPrice - prevPrice) / prevPrice) * 100;

      return { ...bar, roc: roc };
    });
  }

  /**
   * Momentum
   */
  momentum(data, period = 10, source = 'close') {
    if (data.length < period + 1) {
      return data.map(bar => ({ ...bar, momentum: null }));
    }

    return data.map((bar, index) => {
      if (index < period) {
        return { ...bar, momentum: null };
      }

      const currentPrice = this._getPrice(bar, source);
      const prevPrice = this._getPrice(data[index - period], source);
      const momentum = currentPrice - prevPrice;

      return { ...bar, momentum: momentum };
    });
  }

  /**
   * Awesome Oscillator
   */
  awesomeOscillator(data, shortPeriod = 5, longPeriod = 34) {
    if (data.length < Math.max(shortPeriod, longPeriod)) {
      return data.map(bar => ({ ...bar, ao: null }));
    }

    const smaShort = this._sma(data, shortPeriod, 'median');
    const smaLong = this._sma(data, longPeriod, 'median');

    return data.map((bar, index) => {
      const short = smaShort[index] ? smaShort[index].sma : null;
      const long = smaLong[index] ? smaLong[index].sma : null;
      const ao = short !== null && long !== null ? short - long : null;

      return { ...bar, ao: ao };
    });
  }

  /**
   * Money Flow Index (MFI)
   */
  mfi(data, period = 14) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, mfi: null }));
    }

    let positiveMF = 0;
    let negativeMF = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, mfi: null };
      }

      const typicalPrice = ((bar.high || 0) + (bar.low || 0) + (bar.close || 0)) / 3;
      const prevTypicalPrice = ((data[index - 1].high || 0) + (data[index - 1].low || 0) + (data[index - 1].close || 0)) / 3;
      const rawMF = typicalPrice * (bar.volume || 0);

      if (typicalPrice > prevTypicalPrice) {
        positiveMF += rawMF;
      } else if (typicalPrice < prevTypicalPrice) {
        negativeMF += rawMF;
      }

      if (index < period) {
        return { ...bar, mfi: null, positiveMF, negativeMF };
      }

      if (index > period) {
        const oldest = data[index - period];
        const oldestTypicalPrice = ((oldest.high || 0) + (oldest.low || 0) + (oldest.close || 0)) / 3;
        const prevOldestTypicalPrice = ((data[index - period - 1].high || 0) + (data[index - period - 1].low || 0) + (data[index - period - 1].close || 0)) / 3;
        const oldestRawMF = oldestTypicalPrice * (oldest.volume || 0);

        if (oldestTypicalPrice > prevOldestTypicalPrice) {
          positiveMF -= oldestRawMF;
        } else if (oldestTypicalPrice < prevOldestTypicalPrice) {
          negativeMF -= oldestRawMF;
        }
      }

      const moneyRatio = negativeMF !== 0 ? positiveMF / negativeMF : 0;
      const mfi = 100 - (100 / (1 + moneyRatio));

      return { ...bar, mfi: Math.min(100, Math.max(0, mfi)), positiveMF, negativeMF };
    });
  }

  /**
   * Chaikin Money Flow (CMF)
   */
  chaikinMoneyFlow(data, period = 20) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, cmf: null }));
    }

    let moneyFlowMultiplierSum = 0;
    let volumeSum = 0;

    return data.map((bar, index) => {
      const typicalPrice = ((bar.high || 0) + (bar.low || 0) + (bar.close || 0)) / 3;
      const prevTypicalPrice = index > 0 ? ((data[index - 1].high || 0) + (data[index - 1].low || 0) + (data[index - 1].close || 0)) / 3 : typicalPrice;
      const moneyFlowMultiplier = typicalPrice > prevTypicalPrice ? 1 : (typicalPrice < prevTypicalPrice ? -1 : 0);
      const moneyFlowVolume = moneyFlowMultiplier * (bar.volume || 0);

      moneyFlowMultiplierSum += moneyFlowMultiplier;
      volumeSum += bar.volume || 0;

      if (index < period - 1) {
        return { ...bar, cmf: null, moneyFlowMultiplier, moneyFlowVolume };
      }

      if (index > period - 1) {
        const oldest = data[index - period];
        moneyFlowMultiplierSum -= oldest.moneyFlowMultiplier || 0;
        volumeSum -= oldest.volume || 0;
      }

      const cmf = volumeSum !== 0 ? (moneyFlowMultiplierSum / volumeSum) * 100 : 0;

      return { ...bar, cmf: cmf, moneyFlowMultiplier, moneyFlowVolume };
    });
  }

  /**
   * Ultimate Oscillator
   */
  ultimateOscillator(data, period1 = 7, period2 = 14, period3 = 28) {
    if (data.length < Math.max(period1, period2, period3)) {
      return data.map(bar => ({ ...bar, uo: null }));
    }

    return data.map((bar, index) => {
      if (index < Math.max(period1, period2, period3) - 1) {
        return { ...bar, uo: null };
      }

      const bp1 = this._buyingPressure(data, index, period1);
      const bp2 = this._buyingPressure(data, index, period2);
      const bp3 = this._buyingPressure(data, index, period3);

      const uo = (4 * bp1 + 2 * bp2 + bp3) / 7;

      return { ...bar, uo: uo };
    });
  }

  /**
   * Calculate buying pressure for Ultimate Oscillator
   */
  _buyingPressure(data, index, period) {
    const window = data.slice(index - period + 1, index + 1);
    const closes = window.map(b => b.close || 0);
    const minClose = Math.min(...closes);
    const maxClose = Math.max(...closes);
    const currentClose = (data[index].close || 0);
    const bp = (currentClose - minClose) / (maxClose - minClose);
    return isFinite(bp) ? bp : 0;
  }

  /**
   * Simple Moving Average helper
   */
  _sma(data, period, source) {
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
   * Calculate all momentum indicators
   */
  calculateAll(data, options = {}) {
    let processedData = data;

    processedData = this.rsi(processedData, options.rsiPeriod || 14, options.source);
    processedData = this.stochastic(processedData, options.kPeriod || 14, options.dPeriod || 3, options.smoothK || 3, options.smoothD || 3);
    processedData = this.williamsR(processedData, options.wrPeriod || 14);
    processedData = this.cci(processedData, options.cciPeriod || 20);
    processedData = this.roc(processedData, options.rocPeriod || 10, options.source);
    processedData = this.momentum(processedData, options.momentumPeriod || 10, options.source);
    processedData = this.awesomeOscillator(processedData, options.shortPeriod || 5, options.longPeriod || 34);
    processedData = this.mfi(processedData, options.mfiPeriod || 14);
    processedData = this.chaikinMoneyFlow(processedData, options.cmfPeriod || 20);
    processedData = this.ultimateOscillator(processedData, options.uoPeriod1 || 7, options.uoPeriod2 || 14, options.uoPeriod3 || 28);

    return processedData;
  }

  /**
   * Calculate specific momentum indicator
   */
  calculate(data, indicatorName, options = {}) {
    const normalizedName = indicatorName.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (normalizedName) {
      case 'rsi':
        return this.rsi(data, options.period || 14, options.source);
      case 'stochastic':
      case 'stoch':
        return this.stochastic(data, options.kPeriod || 14, options.dPeriod || 3, options.smoothK || 3, options.smoothD || 3);
      case 'williamsr':
      case 'williams':
        return this.williamsR(data, options.period || 14);
      case 'cci':
        return this.cci(data, options.period || 20);
      case 'roc':
        return this.roc(data, options.period || 10, options.source);
      case 'momentum':
        return this.momentum(data, options.period || 10, options.source);
      case 'awesomeoscillator':
      case 'ao':
        return this.awesomeOscillator(data, options.shortPeriod || 5, options.longPeriod || 34);
      case 'mfi':
        return this.mfi(data, options.period || 14);
      case 'chaikinmoneyflow':
      case 'cmf':
        return this.chaikinMoneyFlow(data, options.period || 20);
      case 'ultimateoscillator':
      case 'uo':
        return this.ultimateOscillator(data, options.period1 || 7, options.period2 || 14, options.period3 || 28);
      default:
        console.warn(`Unknown momentum indicator: ${indicatorName}`);
        return data;
    }
  }

  /**
   * Get available momentum indicators
   */
  getAvailableIndicators() {
    return [
      'RSI', 'Stochastic', 'Williams %R', 'CCI',
      'ROC', 'Momentum', 'Awesome Oscillator',
      'MFI', 'Chaikin Money Flow', 'Ultimate Oscillator'
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
      case 'median': return ((bar.high || 0) + (bar.low || 0)) / 2;
      default: return bar.close || 0;
    }
  }
}

module.exports = new MomentumIndicators();
