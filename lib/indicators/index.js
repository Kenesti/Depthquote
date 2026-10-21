/**
 * Technical Indicators Module for Depthquote
 * Master module that consolidates all indicator categories
 */

const trendIndicators = require('./trendIndicators');
const momentumIndicators = require('./momentumIndicators');
const volumeIndicators = require('./volumeIndicators');
const volatilityIndicators = require('./volatilityIndicators');

class TechnicalIndicators {
  constructor() {
    this.trend = trendIndicators;
    this.momentum = momentumIndicators;
    this.volume = volumeIndicators;
    this.volatility = volatilityIndicators;
  }

  /**
   * Calculate all technical indicators
   * @param {Array} data - OHLCV data
   * @param {object} options - Calculation options
   * @returns {Promise<Array>} Data with all indicators
   */
  async calculateAll(data, options = {}) {
    if (!data || data.length === 0) {
      return data || [];
    }

    let processedData = data;

    // Calculate trend indicators
    processedData = await this.trend.calculateAll(processedData, options);

    // Calculate momentum indicators
    processedData = await this.momentum.calculateAll(processedData, options);

    // Calculate volume indicators
    processedData = await this.volume.calculateAll(processedData, options);

    // Calculate volatility indicators
    processedData = await this.volatility.calculateAll(processedData, options);

    return processedData;
  }

  /**
   * Calculate specific indicator
   * @param {Array} data - OHLCV data
   * @param {string|string[]} indicatorName - Name of indicator(s)
   * @param {object} options - Calculation options
   * @returns {Array} Data with specified indicator(s)
   */
  calculate(data, indicatorName, options = {}) {
    if (!data || data.length === 0) {
      return data || [];
    }

    const indicatorNames = Array.isArray(indicatorName) ? indicatorName : [indicatorName];
    let processedData = data;

    for (const name of indicatorNames) {
      const normalizedName = name.toLowerCase();

      // Trend indicators
      if (this.trend.getAvailableIndicators().map(i => i.toLowerCase()).includes(normalizedName)) {
        processedData = this.trend.calculate(processedData, name, options);
        continue;
      }

      // Momentum indicators
      if (this.momentum.getAvailableIndicators().map(i => i.toLowerCase()).includes(normalizedName)) {
        processedData = this.momentum.calculate(processedData, name, options);
        continue;
      }

      // Volume indicators
      if (this.volume.getAvailableIndicators().map(i => i.toLowerCase()).includes(normalizedName)) {
        processedData = this.volume.calculate(processedData, name, options);
        continue;
      }

      // Volatility indicators
      if (this.volatility.getAvailableIndicators().map(i => i.toLowerCase()).includes(normalizedName)) {
        processedData = this.volatility.calculate(processedData, name, options);
        continue;
      }

      console.warn(`Unknown indicator: ${name}`);
    }

    return processedData;
  }

  /**
   * Get available indicators
   * @returns {Array} List of all available indicators
   */
  getAvailableIndicators() {
    return [
      ...this.trend.getAvailableIndicators(),
      ...this.momentum.getAvailableIndicators(),
      ...this.volume.getAvailableIndicators(),
      ...this.volatility.getAvailableIndicators()
    ];
  }

  /**
   * Get indicators by category
   * @returns {object} Indicators grouped by category
   */
  getIndicatorsByCategory() {
    return {
      trend: this.trend.getAvailableIndicators(),
      momentum: this.momentum.getAvailableIndicators(),
      volume: this.volume.getAvailableIndicators(),
      volatility: this.volatility.getAvailableIndicators()
    };
  }
}

// Export singleton instance
const technicalIndicators = new TechnicalIndicators();
module.exports = technicalIndicators;
