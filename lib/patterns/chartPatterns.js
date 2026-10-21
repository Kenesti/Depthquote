/**
 * Chart Pattern Recognition Module
 * Identifies classic chart patterns like head and shoulders, triangles, etc.
 */

class ChartPatterns {
  constructor() {
    // Chart pattern definitions
    this.patternDefinitions = {
      // Reversal Patterns
      head_and_shoulders: {
        type: 'bearish',
        category: 'reversal',
        minBars: 5,
        description: 'Head and Shoulders reversal pattern'
      },
      inverse_head_and_shoulders: {
        type: 'bullish',
        category: 'reversal',
        minBars: 5,
        description: 'Inverse Head and Shoulders reversal pattern'
      },
      double_top: {
        type: 'bearish',
        category: 'reversal',
        minBars: 4,
        description: 'Double Top reversal pattern'
      },
      double_bottom: {
        type: 'bullish',
        category: 'reversal',
        minBars: 4,
        description: 'Double Bottom reversal pattern'
      },
      triple_top: {
        type: 'bearish',
        category: 'reversal',
        minBars: 5,
        description: 'Triple Top reversal pattern'
      },
      triple_bottom: {
        type: 'bullish',
        category: 'reversal',
        minBars: 5,
        description: 'Triple Bottom reversal pattern'
      },
      rounding_top: {
        type: 'bearish',
        category: 'reversal',
        minBars: 5,
        description: 'Rounding Top reversal pattern'
      },
      rounding_bottom: {
        type: 'bullish',
        category: 'reversal',
        minBars: 5,
        description: 'Rounding Bottom reversal pattern'
      },
      v_top: {
        type: 'bearish',
        category: 'reversal',
        minBars: 3,
        description: 'V Top reversal pattern'
      },
      v_bottom: {
        type: 'bullish',
        category: 'reversal',
        minBars: 3,
        description: 'V Bottom reversal pattern'
      },

      // Continuation Patterns
      ascending_triangle: {
        type: 'bullish',
        category: 'continuation',
        minBars: 4,
        description: 'Ascending Triangle continuation pattern'
      },
      descending_triangle: {
        type: 'bearish',
        category: 'continuation',
        minBars: 4,
        description: 'Descending Triangle continuation pattern'
      },
      symmetrical_triangle: {
        type: 'neutral',
        category: 'continuation',
        minBars: 4,
        description: 'Symmetrical Triangle continuation pattern'
      },
      flag: {
        type: 'bullish',
        category: 'continuation',
        minBars: 5,
        description: 'Flag continuation pattern'
      },
      pennant: {
        type: 'neutral',
        category: 'continuation',
        minBars: 5,
        description: 'Pennant continuation pattern'
      },
      rectangle: {
        type: 'neutral',
        category: 'continuation',
        minBars: 4,
        description: 'Rectangle continuation pattern'
      },
      wedge_rising: {
        type: 'bearish',
        category: 'continuation',
        minBars: 5,
        description: 'Rising Wedge continuation pattern'
      },
      wedge_falling: {
        type: 'bullish',
        category: 'continuation',
        minBars: 5,
        description: 'Falling Wedge continuation pattern'
      },

      // Bilateral Patterns
      cup_and_handle: {
        type: 'bullish',
        category: 'bilateral',
        minBars: 7,
        description: 'Cup and Handle pattern'
      },
      
      // Gap Patterns
      breakaway_gap: {
        type: 'continuation',
        category: 'gap',
        minBars: 2,
        description: 'Breakaway Gap pattern'
      },
      exhaustion_gap: {
        type: 'reversal',
        category: 'gap',
        minBars: 2,
        description: 'Exhaustion Gap pattern'
      },
      island_reversal: {
        type: 'reversal',
        category: 'gap',
        minBars: 3,
        description: 'Island Reversal pattern'
      }
    };
  }

  /**
   * Identify chart patterns in the data
   * @param {Array} data - OHLCV data
   * @param {object} options - Pattern detection options
   * @returns {Array} Data with identified chart patterns
   */
  identifyPatterns(data, options = {}) {
    const {
      lookback = 50, // Number of bars to look back for patterns
      minStrength = 0.5 // Minimum pattern strength to report
    } = options;

    if (!Array.isArray(data) || data.length < 5) {
      return data.map(bar => ({ ...bar, chartPatterns: [] }));
    }

    // We'll add patterns to the last bar where they complete
    const result = data.map(bar => ({ ...bar, chartPatterns: [] }));

    // Check for patterns ending at each bar
    for (let i = lookback; i < data.length; i++) {
      const window = data.slice(Math.max(0, i - lookback + 1), i + 1);
      const patterns = this._checkWindowForPatterns(window, i);
      
      if (patterns.length > 0) {
        result[i].chartPatterns = patterns;
      }
    }

    return result;
  }

  /**
   * Check a window of data for chart patterns
   */
  _checkWindowForPatterns(window, endIndex) {
    const patterns = [];

    for (const [patternName, definition] of Object.entries(this.patternDefinitions)) {
      try {
        const pattern = this._checkPattern(window, patternName, definition, endIndex);
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        console.warn(`Error checking pattern ${patternName}:`, error.message);
      }
    }

    return patterns;
  }

  /**
   * Check for a specific chart pattern
   */
  _checkPattern(window, patternName, definition, endIndex) {
    switch (patternName) {
      case 'head_and_shoulders':
        return this._checkHeadAndShoulders(window, endIndex);

      case 'inverse_head_and_shoulders':
        return this._checkInverseHeadAndShoulders(window, endIndex);

      case 'double_top':
        return this._checkDoubleTop(window, endIndex);

      case 'double_bottom':
        return this._checkDoubleBottom(window, endIndex);

      case 'ascending_triangle':
        return this._checkAscendingTriangle(window, endIndex);

      case 'descending_triangle':
        return this._checkDescendingTriangle(window, endIndex);

      case 'symmetrical_triangle':
        return this._checkSymmetricalTriangle(window, endIndex);

      case 'flag':
        return this._checkFlag(window, endIndex);

      case 'pennant':
        return this._checkPennant(window, endIndex);

      case 'rectangle':
        return this._checkRectangle(window, endIndex);

      case 'wedge_rising':
        return this._checkRisingWedge(window, endIndex);

      case 'wedge_falling':
        return this._checkFallingWedge(window, endIndex);

      case 'cup_and_handle':
        return this._checkCupAndHandle(window, endIndex);

      case 'triple_top':
        return this._checkTripleTop(window, endIndex);

      case 'triple_bottom':
        return this._checkTripleBottom(window, endIndex);

      case 'rounding_top':
        return this._checkRoundingTop(window, endIndex);

      case 'rounding_bottom':
        return this._checkRoundingBottom(window, endIndex);

      default:
        return null;
    }
  }

  /**
   * Check for Head and Shoulders pattern
   */
  _checkHeadAndShoulders(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Find local highs
    const highs = this._findLocalExtrema(window, 'high', 'max');
    
    if (highs.length < 3) {
      return null;
    }

    // Check if we have a head and shoulders formation
    const leftShoulder = highs[0];
    const head = highs[1];
    const rightShoulder = highs[2];

    // Head should be higher than both shoulders
    if (head.value <= leftShoulder.value || head.value <= rightShoulder.value) {
      return null;
    }

    // Shoulders should be roughly equal
    const shoulderDiff = Math.abs(leftShoulder.value - rightShoulder.value);
    const avgShoulder = (leftShoulder.value + rightShoulder.value) / 2;
    if (shoulderDiff > avgShoulder * 0.1) {
      return null; // Shoulders too different
    }

    // Neckline should be sloping downward
    const necklineStart = window[leftShoulder.index].low;
    const necklineEnd = window[rightShoulder.index].low;
    const necklineSlope = (necklineEnd - necklineStart) / (rightShoulder.index - leftShoulder.index);

    if (necklineSlope >= 0) {
      return null; // Neckline should be downward sloping
    }

    // Check for break below neckline
    const necklineValue = this._getNecklineValue(window, leftShoulder.index, rightShoulder.index, endIndex);
    const lastBar = window[window.length - 1];

    if (lastBar.close > necklineValue) {
      return null; // No break below neckline yet
    }

    // Calculate pattern strength
    const strength = this._calculateHeadAndShouldersStrength(window, leftShoulder, head, rightShoulder);

    return {
      name: 'head_and_shoulders',
      type: 'bearish',
      category: 'reversal',
      strength: strength,
      confirmed: true,
      points: [
        { index: leftShoulder.index, type: 'left_shoulder', value: leftShoulder.value },
        { index: head.index, type: 'head', value: head.value },
        { index: rightShoulder.index, type: 'right_shoulder', value: rightShoulder.value }
      ],
      neckline: necklineValue,
      target: necklineValue - (head.value - necklineValue)
    };
  }

  /**
   * Check for Inverse Head and Shoulders pattern
   */
  _checkInverseHeadAndShoulders(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Find local lows
    const lows = this._findLocalExtrema(window, 'low', 'min');
    
    if (lows.length < 3) {
      return null;
    }

    // Check if we have an inverse head and shoulders formation
    const leftShoulder = lows[0];
    const head = lows[1];
    const rightShoulder = lows[2];

    // Head should be lower than both shoulders
    if (head.value >= leftShoulder.value || head.value >= rightShoulder.value) {
      return null;
    }

    // Shoulders should be roughly equal
    const shoulderDiff = Math.abs(leftShoulder.value - rightShoulder.value);
    const avgShoulder = (leftShoulder.value + rightShoulder.value) / 2;
    if (shoulderDiff > avgShoulder * 0.1) {
      return null; // Shoulders too different
    }

    // Neckline should be sloping upward
    const necklineStart = window[leftShoulder.index].high;
    const necklineEnd = window[rightShoulder.index].high;
    const necklineSlope = (necklineEnd - necklineStart) / (rightShoulder.index - leftShoulder.index);

    if (necklineSlope <= 0) {
      return null; // Neckline should be upward sloping
    }

    // Check for break above neckline
    const necklineValue = this._getNecklineValue(window, leftShoulder.index, rightShoulder.index, endIndex, 'high');
    const lastBar = window[window.length - 1];

    if (lastBar.close < necklineValue) {
      return null; // No break above neckline yet
    }

    // Calculate pattern strength
    const strength = this._calculateHeadAndShouldersStrength(window, leftShoulder, head, rightShoulder);

    return {
      name: 'inverse_head_and_shoulders',
      type: 'bullish',
      category: 'reversal',
      strength: strength,
      confirmed: true,
      points: [
        { index: leftShoulder.index, type: 'left_shoulder', value: leftShoulder.value },
        { index: head.index, type: 'head', value: head.value },
        { index: rightShoulder.index, type: 'right_shoulder', value: rightShoulder.value }
      ],
      neckline: necklineValue,
      target: necklineValue + (necklineValue - head.value)
    };
  }

  /**
   * Check for Double Top pattern
   */
  _checkDoubleTop(window, endIndex) {
    if (window.length < 4) {
      return null;
    }

    // Find local highs
    const highs = this._findLocalExtrema(window, 'high', 'max');
    
    if (highs.length < 2) {
      return null;
    }

    const firstTop = highs[0];
    const secondTop = highs[1];

    // Tops should be roughly equal
    const topDiff = Math.abs(firstTop.value - secondTop.value);
    const avgTop = (firstTop.value + secondTop.value) / 2;
    if (topDiff > avgTop * 0.03) {
      return null; // Tops too different
    }

    // Check for neckline break
    const neckline = Math.min(window[firstTop.index].low, window[secondTop.index].low);
    const lastBar = window[window.length - 1];

    if (lastBar.close > neckline) {
      return null; // No break below neckline yet
    }

    // Calculate pattern strength
    const strength = this._calculateDoubleTopStrength(window, firstTop, secondTop);

    return {
      name: 'double_top',
      type: 'bearish',
      category: 'reversal',
      strength: strength,
      confirmed: true,
      points: [
        { index: firstTop.index, type: 'first_top', value: firstTop.value },
        { index: secondTop.index, type: 'second_top', value: secondTop.value }
      ],
      neckline: neckline,
      target: neckline - (firstTop.value - neckline)
    };
  }

  /**
   * Check for Double Bottom pattern
   */
  _checkDoubleBottom(window, endIndex) {
    if (window.length < 4) {
      return null;
    }

    // Find local lows
    const lows = this._findLocalExtrema(window, 'low', 'min');
    
    if (lows.length < 2) {
      return null;
    }

    const firstBottom = lows[0];
    const secondBottom = lows[1];

    // Bottoms should be roughly equal
    const bottomDiff = Math.abs(firstBottom.value - secondBottom.value);
    const avgBottom = (firstBottom.value + secondBottom.value) / 2;
    if (bottomDiff > avgBottom * 0.03) {
      return null; // Bottoms too different
    }

    // Check for neckline break
    const neckline = Math.max(window[firstBottom.index].high, window[secondBottom.index].high);
    const lastBar = window[window.length - 1];

    if (lastBar.close < neckline) {
      return null; // No break above neckline yet
    }

    // Calculate pattern strength
    const strength = this._calculateDoubleTopStrength(window, firstBottom, secondBottom);

    return {
      name: 'double_bottom',
      type: 'bullish',
      category: 'reversal',
      strength: strength,
      confirmed: true,
      points: [
        { index: firstBottom.index, type: 'first_bottom', value: firstBottom.value },
        { index: secondBottom.index, type: 'second_bottom', value: secondBottom.value }
      ],
      neckline: neckline,
      target: neckline + (neckline - firstBottom.value)
    };
  }

  /**
   * Check for Ascending Triangle pattern
   */
  _checkAscendingTriangle(window, endIndex) {
    return this._checkTrianglePattern(window, endIndex, 'ascending');
  }

  /**
   * Check for Descending Triangle pattern
   */
  _checkDescendingTriangle(window, endIndex) {
    return this._checkTrianglePattern(window, endIndex, 'descending');
  }

  /**
   * Check for Symmetrical Triangle pattern
   */
  _checkSymmetricalTriangle(window, endIndex) {
    return this._checkTrianglePattern(window, endIndex, 'symmetrical');
  }

  /**
   * Generic triangle pattern checker
   */
  _checkTrianglePattern(window, endIndex, type) {
    if (window.length < 4) {
      return null;
    }

    // Find trend lines
    const { upperLine, lowerLine } = this._findTrendLines(window);

    if (!upperLine || !lowerLine) {
      return null;
    }

    // Check convergence
    const upperSlope = upperLine.slope;
    const lowerSlope = lowerLine.slope;

    switch (type) {
      case 'ascending':
        // Upper line should be horizontal, lower line rising
        if (Math.abs(upperSlope) > 0.001 || lowerSlope <= 0) {
          return null;
        }
        break;

      case 'descending':
        // Lower line should be horizontal, upper line falling
        if (Math.abs(lowerSlope) > 0.001 || upperSlope >= 0) {
          return null;
        }
        break;

      case 'symmetrical':
        // Both lines should be converging
        if ((upperSlope >= 0 && lowerSlope >= 0) || 
            (upperSlope <= 0 && lowerSlope <= 0)) {
          return null;
        }
        break;
    }

    // Check for breakout
    const lastBar = window[window.length - 1];
    const upperValue = this._getTrendLineValue(upperLine, endIndex);
    const lowerValue = this._getTrendLineValue(lowerLine, endIndex);

    let breakoutDirection = null;
    let breakoutConfirmed = false;

    if (type === 'ascending' && lastBar.close > upperValue) {
      breakoutDirection = 'up';
      breakoutConfirmed = true;
    } else if (type === 'descending' && lastBar.close < lowerValue) {
      breakoutDirection = 'down';
      breakoutConfirmed = true;
    } else if (type === 'symmetrical') {
      if (lastBar.close > upperValue) {
        breakoutDirection = 'up';
        breakoutConfirmed = true;
      } else if (lastBar.close < lowerValue) {
        breakoutDirection = 'down';
        breakoutConfirmed = true;
      }
    }

    if (!breakoutConfirmed) {
      return null;
    }

    // Calculate pattern strength
    const strength = this._calculateTriangleStrength(window, upperLine, lowerLine);

    return {
      name: `${type}_triangle`,
      type: breakoutDirection === 'up' ? 'bullish' : 'bearish',
      category: 'continuation',
      strength: strength,
      confirmed: true,
      breakoutDirection: breakoutDirection,
      upperLine: upperLine,
      lowerLine: lowerLine,
      target: breakoutDirection === 'up' ? 
        lastBar.close + (upperValue - lowerValue) :
        lastBar.close - (upperValue - lowerValue)
    };
  }

  /**
   * Check for Flag pattern
   */
  _checkFlag(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // A flag has a strong move (pole) followed by a consolidation (flag)
    const poleStart = Math.max(0, window.length - 10);
    const pole = window.slice(poleStart, window.length - 4);
    const flag = window.slice(window.length - 4);

    // Check for strong move
    const poleChange = (pole[pole.length - 1].close - pole[0].close) / pole[0].close;
    if (Math.abs(poleChange) < 0.05) {
      return null; // Pole not strong enough
    }

    // Check for consolidation
    const flagHigh = Math.max(...flag.map(b => b.high));
    const flagLow = Math.min(...flag.map(b => b.low));
    const flagRange = flagHigh - flagLow;
    const avgFlagPrice = (flagHigh + flagLow) / 2;

    if (flagRange / avgFlagPrice > 0.02) {
      return null; // Flag too volatile
    }

    // Check for breakout in direction of pole
    const poleDirection = poleChange > 0 ? 'up' : 'down';
    const lastBar = window[window.length - 1];
    const flagStartClose = flag[0].close;

    let breakoutConfirmed = false;
    if (poleDirection === 'up' && lastBar.close > flagHigh) {
      breakoutConfirmed = true;
    } else if (poleDirection === 'down' && lastBar.close < flagLow) {
      breakoutConfirmed = true;
    }

    if (!breakoutConfirmed) {
      return null;
    }

    return {
      name: 'flag',
      type: poleDirection === 'up' ? 'bullish' : 'bearish',
      category: 'continuation',
      strength: 70, // Placeholder
      confirmed: true,
      poleDirection: poleDirection,
      flagRange: flagRange,
      target: poleDirection === 'up' ? 
        lastBar.close + (flagRange * 2) :
        lastBar.close - (flagRange * 2)
    };
  }

  /**
   * Check for Pennant pattern
   */
  _checkPennant(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Similar to flag but with converging trend lines
    const { upperLine, lowerLine } = this._findTrendLines(window.slice(-5));

    if (!upperLine || !lowerLine) {
      return null;
    }

    // Check for convergence
    if ((upperLine.slope >= 0 && lowerLine.slope >= 0) || 
        (upperLine.slope <= 0 && lowerLine.slope <= 0)) {
      return null;
    }

    // Check for breakout
    const lastBar = window[window.length - 1];
    const upperValue = this._getTrendLineValue(upperLine, endIndex);
    const lowerValue = this._getTrendLineValue(lowerLine, endIndex);

    let breakoutDirection = null;
    if (lastBar.close > upperValue) {
      breakoutDirection = 'up';
    } else if (lastBar.close < lowerValue) {
      breakoutDirection = 'down';
    }

    if (!breakoutDirection) {
      return null;
    }

    return {
      name: 'pennant',
      type: breakoutDirection === 'up' ? 'bullish' : 'bearish',
      category: 'continuation',
      strength: 70, // Placeholder
      confirmed: true,
      breakoutDirection: breakoutDirection,
      upperLine: upperLine,
      lowerLine: lowerLine
    };
  }

  /**
   * Check for Rectangle pattern
   */
  _checkRectangle(window, endIndex) {
    if (window.length < 4) {
      return null;
    }

    // Find support and resistance levels
    const highs = this._findLocalExtrema(window, 'high', 'max');
    const lows = this._findLocalExtrema(window, 'low', 'min');

    if (highs.length < 2 || lows.length < 2) {
      return null;
    }

    // Check if highs are roughly equal
    const highValues = highs.map(h => h.value);
    const highDiff = Math.max(...highValues) - Math.min(...highValues);
    const avgHigh = (Math.max(...highValues) + Math.min(...highValues)) / 2;

    if (highDiff > avgHigh * 0.02) {
      return null; // Highs not equal enough
    }

    // Check if lows are roughly equal
    const lowValues = lows.map(l => l.value);
    const lowDiff = Math.max(...lowValues) - Math.min(...lowValues);
    const avgLow = (Math.max(...lowValues) + Math.min(...lowValues)) / 2;

    if (lowDiff > avgLow * 0.02) {
      return null; // Lows not equal enough
    }

    // Check for breakout
    const lastBar = window[window.length - 1];
    const resistance = avgHigh;
    const support = avgLow;

    let breakoutDirection = null;
    if (lastBar.close > resistance) {
      breakoutDirection = 'up';
    } else if (lastBar.close < support) {
      breakoutDirection = 'down';
    }

    if (!breakoutDirection) {
      return null;
    }

    return {
      name: 'rectangle',
      type: breakoutDirection === 'up' ? 'bullish' : 'bearish',
      category: 'continuation',
      strength: 70, // Placeholder
      confirmed: true,
      breakoutDirection: breakoutDirection,
      resistance: resistance,
      support: support,
      target: breakoutDirection === 'up' ? 
        lastBar.close + (resistance - support) :
        lastBar.close - (resistance - support)
    };
  }

  /**
   * Check for Rising Wedge pattern
   */
  _checkRisingWedge(window, endIndex) {
    return this._checkWedgePattern(window, endIndex, 'rising');
  }

  /**
   * Check for Falling Wedge pattern
   */
  _checkFallingWedge(window, endIndex) {
    return this._checkWedgePattern(window, endIndex, 'falling');
  }

  /**
   * Generic wedge pattern checker
   */
  _checkWedgePattern(window, endIndex, type) {
    if (window.length < 5) {
      return null;
    }

    // Find trend lines
    const { upperLine, lowerLine } = this._findTrendLines(window);

    if (!upperLine || !lowerLine) {
      return null;
    }

    // Check for convergence in the same direction
    if (type === 'rising') {
      // Both lines should be rising but upper line rising faster
      if (upperLine.slope <= 0 || lowerLine.slope <= 0 || upperLine.slope <= lowerLine.slope) {
        return null;
      }
    } else {
      // Both lines should be falling but lower line falling faster
      if (upperLine.slope >= 0 || lowerLine.slope >= 0 || upperLine.slope >= lowerLine.slope) {
        return null;
      }
    }

    // Check for breakout opposite to wedge direction
    const lastBar = window[window.length - 1];
    const upperValue = this._getTrendLineValue(upperLine, endIndex);
    const lowerValue = this._getTrendLineValue(lowerLine, endIndex);

    let breakoutDirection = null;
    if (type === 'rising' && lastBar.close < lowerValue) {
      breakoutDirection = 'down';
    } else if (type === 'falling' && lastBar.close > upperValue) {
      breakoutDirection = 'up';
    }

    if (!breakoutDirection) {
      return null;
    }

    return {
      name: `wedge_${type}`,
      type: breakoutDirection === 'up' ? 'bullish' : 'bearish',
      category: 'continuation',
      strength: 70, // Placeholder
      confirmed: true,
      breakoutDirection: breakoutDirection,
      wedgeType: type,
      upperLine: upperLine,
      lowerLine: lowerLine
    };
  }

  /**
   * Check for Cup and Handle pattern
   */
  _checkCupAndHandle(window, endIndex) {
    if (window.length < 7) {
      return null;
    }

    // Find the lowest point (cup bottom)
    const lows = this._findLocalExtrema(window, 'low', 'min');
    
    if (lows.length < 1) {
      return null;
    }

    const cupBottom = lows[0];

    // Check for U-shape
    const leftSide = window.slice(0, cupBottom.index);
    const rightSide = window.slice(cupBottom.index + 1);

    if (leftSide.length < 2 || rightSide.length < 2) {
      return null;
    }

    // Check if both sides are rising from the bottom
    const leftTrend = this._calculateTrend(leftSide);
    const rightTrend = this._calculateTrend(rightSide);

    if (leftTrend <= 0 || rightTrend <= 0) {
      return null;
    }

    // Check for handle (small pullback after cup)
    const handleStart = Math.max(cupBottom.index + 2, window.length - 4);
    const handle = window.slice(handleStart);

    if (handle.length < 2) {
      return null;
    }

    const handleTrend = this._calculateTrend(handle);
    if (handleTrend >= 0) {
      return null; // Handle should be a pullback
    }

    // Check for breakout above cup rim
    const cupRim = Math.max(...leftSide.map(b => b.high));
    const lastBar = window[window.length - 1];

    if (lastBar.close <= cupRim) {
      return null; // No breakout yet
    }

    return {
      name: 'cup_and_handle',
      type: 'bullish',
      category: 'bilateral',
      strength: 80, // Placeholder
      confirmed: true,
      cupBottom: cupBottom.value,
      cupRim: cupRim,
      target: cupRim + (cupRim - cupBottom.value)
    };
  }

  /**
   * Check for Triple Top pattern
   */
  _checkTripleTop(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Find local highs
    const highs = this._findLocalExtrema(window, 'high', 'max');
    
    if (highs.length < 3) {
      return null;
    }

    // Check if we have three roughly equal highs
    const highValues = highs.slice(0, 3).map(h => h.value);
    const maxHigh = Math.max(...highValues);
    const minHigh = Math.min(...highValues);
    const avgHigh = (maxHigh + minHigh) / 2;

    if (maxHigh - minHigh > avgHigh * 0.02) {
      return null; // Highs not equal enough
    }

    // Check for neckline break
    const neckline = Math.min(...highs.slice(0, 3).map(h => window[h.index].low));
    const lastBar = window[window.length - 1];

    if (lastBar.close > neckline) {
      return null; // No break below neckline yet
    }

    return {
      name: 'triple_top',
      type: 'bearish',
      category: 'reversal',
      strength: 75, // Placeholder
      confirmed: true,
      points: highs.slice(0, 3).map(h => ({ index: h.index, type: 'top', value: h.value })),
      neckline: neckline,
      target: neckline - (avgHigh - neckline)
    };
  }

  /**
   * Check for Triple Bottom pattern
   */
  _checkTripleBottom(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Find local lows
    const lows = this._findLocalExtrema(window, 'low', 'min');
    
    if (lows.length < 3) {
      return null;
    }

    // Check if we have three roughly equal lows
    const lowValues = lows.slice(0, 3).map(l => l.value);
    const maxLow = Math.max(...lowValues);
    const minLow = Math.min(...lowValues);
    const avgLow = (maxLow + minLow) / 2;

    if (maxLow - minLow > avgLow * 0.02) {
      return null; // Lows not equal enough
    }

    // Check for neckline break
    const neckline = Math.max(...lows.slice(0, 3).map(l => window[l.index].high));
    const lastBar = window[window.length - 1];

    if (lastBar.close < neckline) {
      return null; // No break above neckline yet
    }

    return {
      name: 'triple_bottom',
      type: 'bullish',
      category: 'reversal',
      strength: 75, // Placeholder
      confirmed: true,
      points: lows.slice(0, 3).map(l => ({ index: l.index, type: 'bottom', value: l.value })),
      neckline: neckline,
      target: neckline + (neckline - avgLow)
    };
  }

  /**
   * Check for Rounding Top pattern
   */
  _checkRoundingTop(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Check if price is making lower highs and higher lows (curving downward)
    const highs = this._findLocalExtrema(window, 'high', 'max');
    const lows = this._findLocalExtrema(window, 'low', 'min');

    if (highs.length < 3 || lows.length < 3) {
      return null;
    }

    // Check for rounding pattern
    const highValues = highs.map(h => h.value);
    const lowValues = lows.map(l => l.value);

    // Highs should be decreasing
    for (let i = 1; i < highValues.length; i++) {
      if (highValues[i] >= highValues[i - 1]) {
        return null;
      }
    }

    // Lows should be increasing
    for (let i = 1; i < lowValues.length; i++) {
      if (lowValues[i] <= lowValues[i - 1]) {
        return null;
      }
    }

    // Check for breakout below support
    const support = Math.min(...lowValues);
    const lastBar = window[window.length - 1];

    if (lastBar.close > support) {
      return null; // No break below support yet
    }

    return {
      name: 'rounding_top',
      type: 'bearish',
      category: 'reversal',
      strength: 70, // Placeholder
      confirmed: true,
      support: support,
      target: lastBar.close - (highValues[0] - support)
    };
  }

  /**
   * Check for Rounding Bottom pattern
   */
  _checkRoundingBottom(window, endIndex) {
    if (window.length < 5) {
      return null;
    }

    // Check if price is making higher highs and lower lows (curving upward)
    const highs = this._findLocalExtrema(window, 'high', 'max');
    const lows = this._findLocalExtrema(window, 'low', 'min');

    if (highs.length < 3 || lows.length < 3) {
      return null;
    }

    // Check for rounding pattern
    const highValues = highs.map(h => h.value);
    const lowValues = lows.map(l => l.value);

    // Highs should be increasing
    for (let i = 1; i < highValues.length; i++) {
      if (highValues[i] <= highValues[i - 1]) {
        return null;
      }
    }

    // Lows should be decreasing
    for (let i = 1; i < lowValues.length; i++) {
      if (lowValues[i] >= lowValues[i - 1]) {
        return null;
      }
    }

    // Check for breakout above resistance
    const resistance = Math.max(...highValues);
    const lastBar = window[window.length - 1];

    if (lastBar.close < resistance) {
      return null; // No break above resistance yet
    }

    return {
      name: 'rounding_bottom',
      type: 'bullish',
      category: 'reversal',
      strength: 70, // Placeholder
      confirmed: true,
      resistance: resistance,
      target: lastBar.close + (resistance - lowValues[0])
    };
  }

  // Helper methods

  /**
   * Find local extrema (highs or lows)
   */
  _findLocalExtrema(data, field, type) {
    const extrema = [];
    const windowSize = 2; // Look at 2 bars on each side

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const current = data[i][field];
      const neighbors = [];

      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i) {
          neighbors.push(data[j][field]);
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
   * Find trend lines using linear regression
   */
  _findTrendLines(data) {
    if (data.length < 2) {
      return { upperLine: null, lowerLine: null };
    }

    // Simple approach: use highs and lows
    const highs = data.map((bar, index) => ({ x: index, y: bar.high }));
    const lows = data.map((bar, index) => ({ x: index, y: bar.low }));

    const upperLine = this._calculateTrendLine(highs);
    const lowerLine = this._calculateTrendLine(lows);

    return { upperLine, lowerLine };
  }

  /**
   * Calculate trend line using linear regression
   */
  _calculateTrendLine(points) {
    if (points.length < 2) {
      return null;
    }

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope: slope,
      intercept: intercept,
      points: points
    };
  }

  /**
   * Get trend line value at a specific x
   */
  _getTrendLineValue(line, x) {
    if (!line) {
      return null;
    }
    return line.slope * x + line.intercept;
  }

  /**
   * Get neckline value
   */
  _getNecklineValue(data, startIndex, endIndex, currentIndex, field = 'low') {
    const start = data[startIndex][field];
    const end = data[endIndex][field];
    const slope = (end - start) / (endIndex - startIndex);
    return start + slope * (currentIndex - startIndex);
  }

  /**
   * Calculate trend of a series
   */
  _calculateTrend(data) {
    if (data.length < 2) {
      return 0;
    }

    const closes = data.map(b => b.close);
    const n = closes.length;
    const sumX = data.map((_, i) => i).reduce((sum, val) => sum + val, 0);
    const sumY = closes.reduce((sum, val) => sum + val, 0);
    const sumXY = closes.map((val, i) => val * i).reduce((sum, val) => sum + val, 0);
    const sumX2 = data.map((_, i) => i * i).reduce((sum, val) => sum + val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate Head and Shoulders pattern strength
   */
  _calculateHeadAndShouldersStrength(window, leftShoulder, head, rightShoulder) {
    let strength = 60; // Base strength

    // Add strength based on symmetry
    const leftDistance = head.index - leftShoulder.index;
    const rightDistance = rightShoulder.index - head.index;
    const symmetry = 1 - Math.abs(leftDistance - rightDistance) / Math.max(leftDistance, rightDistance);
    strength += symmetry * 20; // Add up to 20 for perfect symmetry

    // Add strength based on head height relative to shoulders
    const avgShoulder = (leftShoulder.value + rightShoulder.value) / 2;
    const headHeight = (head.value - avgShoulder) / avgShoulder;
    strength += Math.min(headHeight * 100, 20); // Add up to 20 for tall head

    return Math.min(100, Math.max(0, Math.round(strength)));
  }

  /**
   * Calculate Double Top/Bottom pattern strength
   */
  _calculateDoubleTopStrength(window, first, second) {
    let strength = 60; // Base strength

    // Add strength based on distance between tops/bottoms
    const distance = Math.abs(first.index - second.index);
    strength += Math.min(distance * 2, 20); // Add up to 20 for wider patterns

    // Add strength based on height difference (smaller is better)
    const heightDiff = Math.abs(first.value - second.value);
    const avgHeight = (first.value + second.value) / 2;
    const heightRatio = heightDiff / avgHeight;
    strength += (1 - Math.min(heightRatio * 10, 1)) * 20; // Add up to 20 for equal heights

    return Math.min(100, Math.max(0, Math.round(strength)));
  }

  /**
   * Calculate Triangle pattern strength
   */
  _calculateTriangleStrength(window, upperLine, lowerLine) {
    let strength = 60; // Base strength

    // Add strength based on convergence
    const convergence = Math.abs(upperLine.slope - lowerLine.slope);
    strength += Math.min(convergence * 100, 20); // Add up to 20 for strong convergence

    // Add strength based on pattern duration
    const duration = window.length;
    strength += Math.min(duration * 2, 20); // Add up to 20 for longer patterns

    return Math.min(100, Math.max(0, Math.round(strength)));
  }

  /**
   * Get all available chart pattern names
   * @returns {Array} All available chart pattern names
   */
  getAvailablePatterns() {
    return Object.keys(this.patternDefinitions);
  }

  /**
   * Get patterns by category
   * @param {string} category - Pattern category (reversal, continuation, bilateral, gap)
   * @returns {Array} Pattern names of the specified category
   */
  getPatternsByCategory(category) {
    return Object.entries(this.patternDefinitions)
      .filter(([name, def]) => def.category === category)
      .map(([name]) => name);
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

module.exports = new ChartPatterns();
