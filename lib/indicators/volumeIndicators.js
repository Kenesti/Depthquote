/**
 * Volume Indicators Module
 * Contains all volume-based technical indicators
 */

class VolumeIndicators {
  constructor() {}

  /**
   * On-Balance Volume (OBV)
   * @param {Array} data - OHLCV data
   * @returns {Array} Data with OBV values
   */
  obv(data) {
    if (data.length === 0) {
      return data.map(bar => ({ ...bar, obv: null }));
    }

    let obv = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        obv = bar.volume;
        return { ...bar, obv: obv };
      }

      const prevClose = data[index - 1].close;
      
      if (bar.close > prevClose) {
        obv += bar.volume;
      } else if (bar.close < prevClose) {
        obv -= bar.volume;
      }
      // If close == prevClose, OBV remains the same

      return { ...bar, obv: obv };
    });
  }

  /**
   * Volume Weighted Average Price (VWAP)
   * @param {Array} data - OHLCV data
   * @returns {Array} Data with VWAP values
   */
  vwap(data) {
    if (data.length === 0) {
      return data.map(bar => ({ ...bar, vwap: null }));
    }

    let cumulativeVolume = 0;
    let cumulativeTypicalPriceVolume = 0;

    return data.map((bar, index) => {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      
      cumulativeVolume += bar.volume;
      cumulativeTypicalPriceVolume += typicalPrice * bar.volume;

      const vwap = cumulativeTypicalPriceVolume / (cumulativeVolume || 1);

      return { ...bar, vwap: vwap };
    });
  }

  /**
   * Chaikin Oscillator
   * @param {Array} data - OHLCV data
   * @param {object} options - Chaikin Oscillator options
   * @returns {Array} Data with Chaikin Oscillator values
   */
  chaikinOscillator(data, options = {}) {
    const {
      fastPeriod = 3,
      slowPeriod = 10
    } = options;

    if (data.length < slowPeriod) {
      return data.map(bar => ({ ...bar, chaikinOsc: null }));
    }

    // Calculate Chaikin Money Flow
    const cmfData = data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, moneyFlowMultiplier: 0, moneyFlowVolume: 0 };
      }

      const moneyFlowMultiplier = this._calculateMoneyFlowMultiplier(bar, data[index - 1]);
      const moneyFlowVolume = moneyFlowMultiplier * bar.volume;

      return {
        ...bar,
        moneyFlowMultiplier: moneyFlowMultiplier,
        moneyFlowVolume: moneyFlowVolume
      };
    });

    // Calculate fast and slow EMAs of money flow volume
    const fastEma = this._calculateEma(cmfData.map(b => b.moneyFlowVolume), fastPeriod);
    const slowEma = this._calculateEma(cmfData.map(b => b.moneyFlowVolume), slowPeriod);

    return data.map((bar, index) => {
      if (index < slowPeriod - 1) {
        return { ...bar, chaikinOsc: null };
      }

      const fast = fastEma[index] || 0;
      const slow = slowEma[index] || 0;
      const chaikinOsc = fast - slow;

      return { ...bar, chaikinOsc: chaikinOsc };
    });
  }

  /**
   * Klinger Oscillator
   * @param {Array} data - OHLCV data
   * @param {object} options - Klinger Oscillator options
   * @returns {Array} Data with Klinger Oscillator values
   */
  klingerOscillator(data, options = {}) {
    const {
      fastPeriod = 34,
      slowPeriod = 55,
      signalPeriod = 13
    } = options;

    const maxPeriod = Math.max(fastPeriod, slowPeriod, signalPeriod);
    if (data.length < maxPeriod) {
      return data.map(bar => ({ ...bar, klinger: null, klingerSignal: null }));
    }

    // Calculate Volume Force
    const volumeForce = data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, volumeForce: 0 };
      }

      const change = bar.close - data[index - 1].close;
      const vf = bar.volume * change * 100;

      return { ...bar, volumeForce: vf };
    });

    // Calculate fast and slow EMAs
    const fastEma = this._calculateEma(volumeForce.map(b => b.volumeForce), fastPeriod);
    const slowEma = this._calculateEma(volumeForce.map(b => b.volumeForce), slowPeriod);

    // Calculate Klinger Oscillator
    const klinger = volumeForce.map((bar, index) => {
      if (index < slowPeriod - 1) {
        return null;
      }
      return (fastEma[index] || 0) - (slowEma[index] || 0);
    });

    // Calculate signal line
    const signal = this._calculateEma(klinger, signalPeriod);

    return data.map((bar, index) => {
      return {
        ...bar,
        klinger: klinger[index],
        klingerSignal: signal[index]
      };
    });
  }

  /**
   * Volume Price Trend (VPT)
   * @param {Array} data - OHLCV data
   * @returns {Array} Data with VPT values
   */
  volumePriceTrend(data) {
    if (data.length === 0) {
      return data.map(bar => ({ ...bar, vpt: null }));
    }

    let vpt = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, vpt: 0 };
      }

      const prevClose = data[index - 1].close;
      const change = bar.close - prevClose;
      const percentChange = (change / prevClose) * 100;

      vpt += bar.volume * percentChange;

      return { ...bar, vpt: vpt };
    });
  }

  /**
   * Negative Volume Index (NVI)
   * @param {Array} data - OHLCV data
   * @param {number} period - NVI period
   * @returns {Array} Data with NVI values
   */
  negativeVolumeIndex(data, period = 255) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, nvi: null }));
    }

    let nvi = 1000;
    let prevNvi = 1000;
    let prevVolume = data[0].volume;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, nvi: 1000 };
      }

      if (bar.volume < prevVolume) {
        const change = bar.close - data[index - 1].close;
        const percentChange = (change / data[index - 1].close) * 100;
        nvi = prevNvi * (1 + percentChange / 100);
      }

      prevVolume = bar.volume;
      prevNvi = nvi;

      return { ...bar, nvi: nvi };
    });
  }

  /**
   * Positive Volume Index (PVI)
   * @param {Array} data - OHLCV data
   * @param {number} period - PVI period
   * @returns {Array} Data with PVI values
   */
  positiveVolumeIndex(data, period = 255) {
    if (data.length < period) {
      return data.map(bar => ({ ...bar, pvi: null }));
    }

    let pvi = 1000;
    let prevPvi = 1000;
    let prevVolume = data[0].volume;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, pvi: 1000 };
      }

      if (bar.volume > prevVolume) {
        const change = bar.close - data[index - 1].close;
        const percentChange = (change / data[index - 1].close) * 100;
        pvi = prevPvi * (1 + percentChange / 100);
      }

      prevVolume = bar.volume;
      prevPvi = pvi;

      return { ...bar, pvi: pvi };
    });
  }

  /**
   * Volume Ratio
   * @param {Array} data - OHLCV data
   * @param {number} period - Volume Ratio period
   * @returns {Array} Data with Volume Ratio values
   */
  volumeRatio(data, period = 20) {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, volumeRatio: null }));
    }

    return data.map((bar, index) => {
      if (index < period - 1) {
        return { ...bar, volumeRatio: null };
      }

      const window = data.slice(index - period + 1, index + 1);
      const volumes = window.map(b => b.volume);
      const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / period;

      const volumeRatio = bar.volume / (avgVolume || 1);

      return { ...bar, volumeRatio: volumeRatio };
    });
  }

  /**
   * Ease of Movement (EOM)
   * @param {Array} data - OHLCV data
   * @param {number} period - EOM period
   * @returns {Array} Data with EOM values
   */
  easeOfMovement(data, period = 14) {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, eom: null }));
    }

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, eom: null };
      }

      const prev = data[index - 1];
      const distanceMoved = ((bar.high + bar.low) / 2) - ((prev.high + prev.low) / 2);
      const boxRatio = (bar.volume / 100000000) / (bar.high - bar.low);

      if (boxRatio === 0) {
        return { ...bar, eom: null };
      }

      const eom = distanceMoved / boxRatio;

      if (index < period - 1) {
        return { ...bar, eom: null };
      }

      return { ...bar, eom: eom };
    });
  }

  /**
   * Force Index
   * @param {Array} data - OHLCV data
   * @param {number} period - Force Index period
   * @returns {Array} Data with Force Index values
   */
  forceIndex(data, period = 13) {
    if (period <= 0 || data.length < period) {
      return data.map(bar => ({ ...bar, forceIndex: null }));
    }

    // Calculate raw Force Index
    const rawForce = data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, rawForce: 0 };
      }

      const change = bar.close - data[index - 1].close;
      const raw = change * bar.volume;

      return { ...bar, rawForce: raw };
    });

    // Calculate SMA of raw Force Index
    const forceIndex = this._sma(rawForce.map(b => b.rawForce), period);

    return data.map((bar, index) => ({
      ...bar,
      forceIndex: forceIndex[index]
    }));
  }

  /**
   * Money Stream
   * @param {Array} data - OHLCV data
   * @returns {Array} Data with Money Stream values
   */
  moneyStream(data) {
    if (data.length === 0) {
      return data.map(bar => ({ ...bar, moneyStream: null }));
    }

    let moneyStream = 0;

    return data.map((bar, index) => {
      if (index === 0) {
        return { ...bar, moneyStream: 0 };
      }

      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      const prevTypicalPrice = (data[index - 1].high + data[index - 1].low + data[index - 1].close) / 3;

      if (typicalPrice > prevTypicalPrice) {
        moneyStream += typicalPrice * bar.volume;
      } else {
        moneyStream -= typicalPrice * bar.volume;
      }

      return { ...bar, moneyStream: moneyStream };
    });
  }

  /**
   * Calculate Money Flow Multiplier
   */
  _calculateMoneyFlowMultiplier(current, previous) {
    const typicalPrice = (current.high + current.low + current.close) / 3;
    const prevTypicalPrice = (previous.high + previous.low + previous.close) / 3;

    if (typicalPrice > prevTypicalPrice) {
      return 1;
    } else if (typicalPrice < prevTypicalPrice) {
      return -1;
    }
    return 0;
  }

  /**
   * Calculate EMA
   */
  _calculateEma(values, period) {
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
}

module.exports = new VolumeIndicators();
