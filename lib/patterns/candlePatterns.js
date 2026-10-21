/**
 * Candlestick Pattern Recognition Module
 * Comprehensive library for identifying candlestick patterns
 */

const { CANDLE_PATTERNS } = require('../../config/constants');

class CandlePatterns {
  constructor() {
    // Pattern definitions with their characteristics
    this.patternDefinitions = {
      // Bullish patterns
      hammer: {
        type: 'bullish',
        bodySize: 'small',
        lowerShadow: 'long',
        upperShadow: 'short',
        position: 'bottom',
        confirmation: 'next_bullish'
      },
      inverted_hammer: {
        type: 'bullish',
        bodySize: 'small',
        lowerShadow: 'short',
        upperShadow: 'long',
        position: 'bottom',
        confirmation: 'next_bullish'
      },
      bullish_engulfing: {
        type: 'bullish',
        patternLength: 2,
        condition: (prev, current) => current.close > prev.open && current.open < prev.close,
        confirmation: 'next_bullish'
      },
      piercing_line: {
        type: 'bullish',
        patternLength: 2,
        condition: (prev, current) => 
          prev.close < prev.open && 
          current.close > current.open &&
          current.close > prev.close + (prev.open - prev.close) * 0.5,
        confirmation: 'next_bullish'
      },
      morning_star: {
        type: 'bullish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close < first.open &&
          second.open < first.close && second.close > second.open &&
          third.close > third.open && third.close > second.close,
        confirmation: 'next_bullish'
      },
      three_white_soldiers: {
        type: 'bullish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close > first.open &&
          second.close > second.open && second.close > first.close &&
          third.close > third.open && third.close > second.close,
        confirmation: 'next_bullish'
      },
      bullish_harami: {
        type: 'bullish',
        patternLength: 2,
        condition: (prev, current) =>
          prev.close < prev.open &&
          current.close > current.open &&
          current.high < prev.high &&
          current.low > prev.low,
        confirmation: 'next_bullish'
      },
      tweezer_bottom: {
        type: 'bullish',
        patternLength: 2,
        condition: (prev, current) =>
          prev.close < prev.open &&
          current.close > current.open &&
          Math.abs(prev.low - current.low) < (prev.high - prev.low) * 0.1,
        confirmation: 'next_bullish'
      },
      three_inside_up: {
        type: 'bullish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close < first.open &&
          second.close > second.open && second.high < first.high && second.low > first.low &&
          third.close > third.open && third.close > second.close,
        confirmation: 'next_bullish'
      },
      rising_three_methods: {
        type: 'bullish',
        patternLength: 5,
        condition: (bars) => {
          const [first, second, third, fourth, fifth] = bars;
          return first.close > first.open &&
                 second.close < second.open &&
                 third.close < third.open &&
                 fourth.close < fourth.open &&
                 fifth.close > fifth.open &&
                 fifth.close > first.close;
        },
        confirmation: 'next_bullish'
      },

      // Bearish patterns
      shooting_star: {
        type: 'bearish',
        bodySize: 'small',
        lowerShadow: 'short',
        upperShadow: 'long',
        position: 'top',
        confirmation: 'next_bearish'
      },
      hanging_man: {
        type: 'bearish',
        bodySize: 'small',
        lowerShadow: 'long',
        upperShadow: 'short',
        position: 'top',
        confirmation: 'next_bearish'
      },
      bearish_engulfing: {
        type: 'bearish',
        patternLength: 2,
        condition: (prev, current) => current.close < prev.open && current.open > prev.close,
        confirmation: 'next_bearish'
      },
      dark_cloud_cover: {
        type: 'bearish',
        patternLength: 2,
        condition: (prev, current) =>
          prev.close > prev.open &&
          current.close < current.open &&
          current.close < prev.close + (prev.close - prev.open) * 0.5,
        confirmation: 'next_bearish'
      },
      evening_star: {
        type: 'bearish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close > first.open &&
          second.open > first.close && second.close < second.open &&
          third.close < third.open && third.close < second.close,
        confirmation: 'next_bearish'
      },
      three_black_crows: {
        type: 'bearish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close < first.open &&
          second.close < second.open && second.close < first.close &&
          third.close < third.open && third.close < second.close,
        confirmation: 'next_bearish'
      },
      bearish_harami: {
        type: 'bearish',
        patternLength: 2,
        condition: (prev, current) =>
          prev.close > prev.open &&
          current.close < current.open &&
          current.high < prev.high &&
          current.low > prev.low,
        confirmation: 'next_bearish'
      },
      tweezer_top: {
        type: 'bearish',
        patternLength: 2,
        condition: (prev, current) =>
          prev.close > prev.open &&
          current.close < current.open &&
          Math.abs(prev.high - current.high) < (prev.high - prev.low) * 0.1,
        confirmation: 'next_bearish'
      },
      three_inside_down: {
        type: 'bearish',
        patternLength: 3,
        condition: (first, second, third) =>
          first.close > first.open &&
          second.close < second.open && second.high < first.high && second.low > first.low &&
          third.close < third.open && third.close < second.close,
        confirmation: 'next_bearish'
      },
      falling_three_methods: {
        type: 'bearish',
        patternLength: 5,
        condition: (bars) => {
          const [first, second, third, fourth, fifth] = bars;
          return first.close < first.open &&
                 second.close > second.open &&
                 third.close > third.open &&
                 fourth.close > fourth.open &&
                 fifth.close < fifth.open &&
                 fifth.close < first.close;
        },
        confirmation: 'next_bearish'
      },

      // Neutral patterns
      doji: {
        type: 'neutral',
        condition: (bar) => Math.abs(bar.open - bar.close) < (bar.high - bar.low) * 0.1
      },
      spinning_top: {
        type: 'neutral',
        condition: (bar) => {
          const bodySize = Math.abs(bar.open - bar.close);
          const totalRange = bar.high - bar.low;
          return bodySize < totalRange * 0.5 && bodySize > totalRange * 0.1;
        }
      },
      long_legged_doji: {
        type: 'neutral',
        condition: (bar) => {
          const bodySize = Math.abs(bar.open - bar.close);
          const totalRange = bar.high - bar.low;
          return bodySize < totalRange * 0.1 && totalRange > (bar.high + bar.low) / 2 * 0.1;
        }
      },
      dragonfly_doji: {
        type: 'neutral',
        condition: (bar) => {
          const bodySize = Math.abs(bar.open - bar.close);
          const lowerShadow = bar.close - bar.low;
          const upperShadow = bar.high - bar.open;
          return bodySize < (bar.high - bar.low) * 0.1 && lowerShadow > upperShadow * 2;
        }
      },
      gravestone_doji: {
        type: 'neutral',
        condition: (bar) => {
          const bodySize = Math.abs(bar.open - bar.close);
          const lowerShadow = bar.close - bar.low;
          const upperShadow = bar.high - bar.open;
          return bodySize < (bar.high - bar.low) * 0.1 && upperShadow > lowerShadow * 2;
        }
      },
      high_wave: {
        type: 'neutral',
        condition: (bar) => {
          const bodySize = Math.abs(bar.open - bar.close);
          const totalRange = bar.high - bar.low;
          return bodySize < totalRange * 0.2 && totalRange > (bar.high + bar.low) / 2 * 0.2;
        }
      },
      marubozu: {
        type: 'neutral',
        condition: (bar) => bar.open === bar.low || bar.open === bar.high
      }
    };
  }

  /**
   * Identify all candlestick patterns in the data
   * @param {Array} data - OHLCV data
   * @param {object} options - Pattern detection options
   * @returns {Array} Data with identified patterns
   */
  identifyPatterns(data, options = {}) {
    const {
      lookback = 5, // Number of previous bars to consider for multi-bar patterns
      includeSingle = true,
      includeMulti = true
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
      return data.map(bar => ({ ...bar, patterns: [] }));
    }

    return data.map((bar, index) => {
      const patterns = [];

      // Check single-bar patterns
      if (includeSingle) {
        patterns.push(...this._checkSingleBarPatterns(bar));
      }

      // Check multi-bar patterns
      if (includeMulti && index >= lookback) {
        const window = data.slice(Math.max(0, index - lookback), index + 1);
        patterns.push(...this._checkMultiBarPatterns(window, index));
      }

      return {
        ...bar,
        patterns: patterns
      };
    });
  }

  /**
   * Check single-bar patterns
   */
  _checkSingleBarPatterns(bar) {
    const patterns = [];

    for (const [patternName, definition] of Object.entries(this.patternDefinitions)) {
      // Skip multi-bar patterns
      if (definition.patternLength && definition.patternLength > 1) {
        continue;
      }

      // Skip if no condition function
      if (!definition.condition) {
        continue;
      }

      // Check if pattern matches
      if (definition.condition(bar)) {
        patterns.push({
          name: patternName,
          type: definition.type,
          strength: this._calculatePatternStrength(bar, patternName),
          confirmed: false
        });
      }
    }

    return patterns;
  }

  /**
   * Check multi-bar patterns
   */
  _checkMultiBarPatterns(window, currentIndex) {
    const patterns = [];

    for (const [patternName, definition] of Object.entries(this.patternDefinitions)) {
      // Skip single-bar patterns
      if (!definition.patternLength || definition.patternLength <= 1) {
        continue;
      }

      // Skip if no condition function
      if (!definition.condition) {
        continue;
      }

      // Check if we have enough data
      if (window.length < definition.patternLength) {
        continue;
      }

      // Get the required number of bars
      const patternBars = window.slice(-definition.patternLength);

      // Check if pattern matches - wrap in try-catch for safety
      try {
        if (definition.condition) {
          // Check the condition function's parameter count
          const paramCount = definition.condition.length;
          let result;
          
          // If condition expects 1 parameter (array), pass the array
          if (paramCount === 1) {
            result = definition.condition(patternBars);
          } else {
            // Otherwise, spread the array as individual arguments
            result = definition.condition(...patternBars);
          }
          
          if (result) {
            patterns.push({
              name: patternName,
              type: definition.type,
              length: definition.patternLength,
              strength: this._calculatePatternStrength(patternBars, patternName),
              confirmed: false,
              bars: patternBars.map(b => ({ date: b.date, ...b }))
            });
          }
        }
      } catch (error) {
        console.warn(`Error checking pattern ${patternName}:`, error.message);
      }
    }

    return patterns;
  }

  /**
   * Calculate pattern strength (0-100)
   */
  _calculatePatternStrength(patternData, patternName) {
    const definition = this.patternDefinitions[patternName];
    if (!definition) {
      return 50;
    }

    let strength = 50; // Base strength

    // Adjust strength based on pattern characteristics
    if (Array.isArray(patternData)) {
      // Multi-bar pattern
      const lastBar = patternData[patternData.length - 1];
      const firstBar = patternData[0];

      // Check for strong momentum
      if (definition.type === 'bullish') {
        const priceChange = (lastBar.close - firstBar.close) / firstBar.close;
        strength += Math.min(priceChange * 100 * 2, 30); // Add up to 30 for strong moves
      } else if (definition.type === 'bearish') {
        const priceChange = (firstBar.close - lastBar.close) / firstBar.close;
        strength += Math.min(priceChange * 100 * 2, 30); // Add up to 30 for strong moves
      }

      // Check volume confirmation
      const avgVolume = patternData.reduce((sum, bar) => sum + bar.volume, 0) / patternData.length;
      const lastVolume = lastBar.volume;
      if (lastVolume > avgVolume * 1.5) {
        strength += 10; // Volume confirmation adds 10
      }
    } else {
      // Single-bar pattern
      const bar = patternData;
      const range = bar.high - bar.low;
      const bodySize = Math.abs(bar.open - bar.close);

      // Stronger patterns have larger shadows relative to body
      if (definition.bodySize === 'small' && range > 0) {
        const bodyRatio = bodySize / range;
        strength += (0.2 - bodyRatio) * 50; // Add up to 10 for very small body
      }

      // Check for long shadows
      if (definition.lowerShadow === 'long') {
        const lowerShadow = bar.close > bar.open ? bar.close - bar.low : bar.open - bar.low;
        const shadowRatio = lowerShadow / range;
        strength += shadowRatio * 20; // Add up to 20 for very long shadow
      }

      if (definition.upperShadow === 'long') {
        const upperShadow = bar.close > bar.open ? bar.high - bar.open : bar.high - bar.close;
        const shadowRatio = upperShadow / range;
        strength += shadowRatio * 20; // Add up to 20 for very long shadow
      }
    }

    // Ensure strength is between 0 and 100
    return Math.min(100, Math.max(0, Math.round(strength)));
  }

  /**
   * Confirm patterns based on subsequent price action
   * @param {Array} data - OHLCV data with patterns
   * @param {number} confirmationBars - Number of bars to check for confirmation
   * @returns {Array} Data with confirmed patterns
   */
  confirmPatterns(data, confirmationBars = 1) {
    if (!Array.isArray(data) || data.length === 0) {
      return data;
    }

    // First, identify all patterns
    const dataWithPatterns = this.identifyPatterns(data, { includeSingle: true, includeMulti: true });

    // Then, confirm patterns based on subsequent action
    return dataWithPatterns.map((bar, index) => {
      const patterns = bar.patterns || [];

      const confirmedPatterns = patterns.map(pattern => {
        const confirmed = this._checkConfirmation(data, index, pattern, confirmationBars);
        return { ...pattern, confirmed: confirmed };
      });

      return {
        ...bar,
        patterns: confirmedPatterns
      };
    });
  }

  /**
   * Check if a pattern is confirmed
   */
  _checkConfirmation(data, patternIndex, pattern, confirmationBars) {
    const definition = this.patternDefinitions[pattern.name];
    if (!definition || !definition.confirmation) {
      return false;
    }

    // Check if we have enough data after the pattern
    if (patternIndex + confirmationBars >= data.length) {
      return false;
    }

    // Get the confirmation bars
    const confirmationWindow = data.slice(patternIndex + 1, patternIndex + 1 + confirmationBars);

    switch (definition.confirmation) {
      case 'next_bullish':
        // Check if next bar(s) are bullish
        return confirmationWindow.every(bar => bar.close > bar.open);

      case 'next_bearish':
        // Check if next bar(s) are bearish
        return confirmationWindow.every(bar => bar.close < bar.open);

      case 'price_above':
        // Check if price moves above pattern high
        const patternHigh = Math.max(...(pattern.bars || [bar]).map(b => b.high));
        return confirmationWindow.every(bar => bar.close > patternHigh);

      case 'price_below':
        // Check if price moves below pattern low
        const patternLow = Math.min(...(pattern.bars || [bar]).map(b => b.low));
        return confirmationWindow.every(bar => bar.close < patternLow);

      default:
        return false;
    }
  }

  /**
   * Get all bullish patterns
   * @param {Array} data - OHLCV data
   * @returns {Array} Bullish patterns found
   */
  getBullishPatterns(data) {
    const dataWithPatterns = this.identifyPatterns(data);
    const bullishPatterns = [];

    dataWithPatterns.forEach((bar, index) => {
      bar.patterns.forEach(pattern => {
        if (pattern.type === 'bullish') {
          bullishPatterns.push({
            ...pattern,
            date: bar.date,
            index: index
          });
        }
      });
    });

    return bullishPatterns;
  }

  /**
   * Get all bearish patterns
   * @param {Array} data - OHLCV data
   * @returns {Array} Bearish patterns found
   */
  getBearishPatterns(data) {
    const dataWithPatterns = this.identifyPatterns(data);
    const bearishPatterns = [];

    dataWithPatterns.forEach((bar, index) => {
      bar.patterns.forEach(pattern => {
        if (pattern.type === 'bearish') {
          bearishPatterns.push({
            ...pattern,
            date: bar.date,
            index: index
          });
        }
      });
    });

    return bearishPatterns;
  }

  /**
   * Get all neutral patterns
   * @param {Array} data - OHLCV data
   * @returns {Array} Neutral patterns found
   */
  getNeutralPatterns(data) {
    const dataWithPatterns = this.identifyPatterns(data);
    const neutralPatterns = [];

    dataWithPatterns.forEach((bar, index) => {
      bar.patterns.forEach(pattern => {
        if (pattern.type === 'neutral') {
          neutralPatterns.push({
            ...pattern,
            date: bar.date,
            index: index
          });
        }
      });
    });

    return neutralPatterns;
  }

  /**
   * Get pattern statistics
   * @param {Array} data - OHLCV data
   * @returns {object} Pattern statistics
   */
  getPatternStatistics(data) {
    const dataWithPatterns = this.identifyPatterns(data);
    
    const stats = {
      totalPatterns: 0,
      bullish: 0,
      bearish: 0,
      neutral: 0,
      byType: {},
      confirmed: 0,
      unconfirmed: 0
    };

    dataWithPatterns.forEach(bar => {
      bar.patterns.forEach(pattern => {
        stats.totalPatterns++;
        stats[pattern.type]++;
        stats.byType[pattern.name] = (stats.byType[pattern.name] || 0) + 1;
        
        if (pattern.confirmed) {
          stats.confirmed++;
        } else {
          stats.unconfirmed++;
        }
      });
    });

    return stats;
  }

  /**
   * Check for specific pattern
   * @param {Array} data - OHLCV data
   * @param {string} patternName - Name of the pattern to check
   * @returns {Array} Instances of the specified pattern
   */
  checkPattern(data, patternName) {
    const definition = this.patternDefinitions[patternName];
    if (!definition) {
      return [];
    }

    const instances = [];

    if (!definition.patternLength || definition.patternLength === 1) {
      // Single-bar pattern
      data.forEach((bar, index) => {
        if (definition.condition && definition.condition(bar)) {
          instances.push({
            name: patternName,
            type: definition.type,
            date: bar.date,
            index: index,
            bar: bar,
            strength: this._calculatePatternStrength(bar, patternName)
          });
        }
      });
    } else {
      // Multi-bar pattern
      for (let i = definition.patternLength - 1; i < data.length; i++) {
        const window = data.slice(i - definition.patternLength + 1, i + 1);
        if (definition.condition && definition.condition(...window)) {
          instances.push({
            name: patternName,
            type: definition.type,
            date: data[i].date,
            index: i,
            bars: window,
            strength: this._calculatePatternStrength(window, patternName)
          });
        }
      }
    }

    return instances;
  }

  /**
   * Get all available pattern names
   * @returns {Array} All available pattern names
   */
  getAvailablePatterns() {
    return Object.keys(this.patternDefinitions);
  }

  /**
   * Get patterns by type
   * @param {string} type - Pattern type (bullish, bearish, neutral)
   * @returns {Array} Pattern names of the specified type
   */
  getPatternsByType(type) {
    return Object.entries(this.patternDefinitions)
      .filter(([name, def]) => def.type === type)
      .map(([name]) => name);
  }
}

module.exports = new CandlePatterns();
