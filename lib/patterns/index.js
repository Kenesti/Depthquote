/**
 * Pattern Recognition Master Module
 * Consolidates all pattern recognition into a single interface
 */

const candlePatterns = require('./candlePatterns');
const chartPatterns = require('./chartPatterns');

class PatternRecognition {
  constructor() {
    // Candle patterns
    this.candle = {
      identify: candlePatterns.identifyPatterns.bind(candlePatterns),
      confirm: candlePatterns.confirmPatterns.bind(candlePatterns),
      getBullish: candlePatterns.getBullishPatterns.bind(candlePatterns),
      getBearish: candlePatterns.getBearishPatterns.bind(candlePatterns),
      getNeutral: candlePatterns.getNeutralPatterns.bind(candlePatterns),
      getStatistics: candlePatterns.getPatternStatistics.bind(candlePatterns),
      checkPattern: candlePatterns.checkPattern.bind(candlePatterns),
      getAvailable: candlePatterns.getAvailablePatterns.bind(candlePatterns),
      getByType: candlePatterns.getPatternsByType.bind(candlePatterns)
    };

    // Chart patterns
    this.chart = {
      identify: chartPatterns.identifyPatterns.bind(chartPatterns),
      getAvailable: chartPatterns.getAvailablePatterns.bind(chartPatterns),
      getByCategory: chartPatterns.getPatternsByCategory.bind(chartPatterns),
      getByType: chartPatterns.getPatternsByType.bind(chartPatterns)
    };

    // Combined pattern recognition
    this.all = {
      ...this.candle,
      ...this.chart
    };
  }

  /**
   * Identify all patterns (candle and chart) in the data
   * @param {Array} data - OHLCV data
   * @param {object} options - Pattern detection options
   * @returns {Array} Data with all patterns identified
   */
  async identifyAll(data, options = {}) {
    const {
      includeCandle = true,
      includeChart = true,
      candleOptions = {},
      chartOptions = {}
    } = options;

    let result = [...data];

    // Identify candle patterns
    if (includeCandle) {
      result = candlePatterns.identifyPatterns(result, candleOptions);
    }

    // Identify chart patterns
    if (includeChart) {
      const chartData = chartPatterns.identifyPatterns(result, chartOptions);
      
      // Merge chart patterns with candle patterns
      result = result.map((bar, index) => ({
        ...bar,
        chartPatterns: chartData[index].chartPatterns || []
      }));
    }

    return result;
  }

  /**
   * Get all patterns found in the data
   * @param {Array} data - OHLCV data with patterns
   * @returns {object} All patterns found, grouped by type
   */
  getAllPatterns(data) {
    const allPatterns = {
      candle: {
        bullish: [],
        bearish: [],
        neutral: []
      },
      chart: {
        bullish: [],
        bearish: [],
        neutral: []
      }
    };

    data.forEach((bar, index) => {
      // Candle patterns
      if (bar.patterns) {
        bar.patterns.forEach(pattern => {
          allPatterns.candle[pattern.type].push({
            ...pattern,
            date: bar.date,
            index: index
          });
        });
      }

      // Chart patterns
      if (bar.chartPatterns) {
        bar.chartPatterns.forEach(pattern => {
          allPatterns.chart[pattern.type].push({
            ...pattern,
            date: bar.date,
            index: index
          });
        });
      }
    });

    return allPatterns;
  }

  /**
   * Get pattern statistics
   * @param {Array} data - OHLCV data
   * @returns {object} Pattern statistics
   */
  getStatistics(data) {
    const candleStats = candlePatterns.getPatternStatistics(data);
    
    // Count chart patterns
    const chartData = chartPatterns.identifyPatterns(data);
    let chartCount = 0;
    chartData.forEach(bar => {
      chartCount += bar.chartPatterns ? bar.chartPatterns.length : 0;
    });

    return {
      candle: candleStats,
      chart: {
        totalPatterns: chartCount
      },
      total: candleStats.totalPatterns + chartCount
    };
  }

  /**
   * Get list of all available patterns
   * @returns {object} All available patterns grouped by type
   */
  getAvailablePatterns() {
    return {
      candle: candlePatterns.getAvailablePatterns(),
      chart: chartPatterns.getAvailablePatterns(),
      all: [
        ...candlePatterns.getAvailablePatterns(),
        ...chartPatterns.getAvailablePatterns()
      ]
    };
  }

  /**
   * Calculate pattern-based signals
   * @param {Array} data - OHLCV data with patterns
   * @returns {object} Pattern-based trading signals
   */
  calculatePatternSignals(data) {
    const allPatterns = this.getAllPatterns(data);
    
    const signals = {
      bullish: [],
      bearish: [],
      neutral: [],
      score: 0,
      recommendation: 'neutral'
    };

    // Count patterns by type and calculate scores
    const bullishScore = allPatterns.candle.bullish.length * 2 + allPatterns.chart.bullish.length * 3;
    const bearishScore = allPatterns.candle.bearish.length * 2 + allPatterns.chart.bearish.length * 3;

    signals.bullish = allPatterns.candle.bullish.concat(allPatterns.chart.bullish);
    signals.bearish = allPatterns.candle.bearish.concat(allPatterns.chart.bearish);
    signals.neutral = allPatterns.candle.neutral.concat(allPatterns.chart.neutral);

    signals.score = bullishScore - bearishScore;

    // Determine recommendation
    if (signals.score > 2) {
      signals.recommendation = 'bullish';
    } else if (signals.score < -2) {
      signals.recommendation = 'bearish';
    } else {
      signals.recommendation = 'neutral';
    }

    return signals;
  }
}

module.exports = new PatternRecognition();
