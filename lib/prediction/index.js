/**
 * Prediction Models Master Module
 * Consolidates all prediction methods into a single interface
 */

const statisticalModels = require('./statisticalModels');
const machineLearningModels = require('./machineLearningModels');
const technicalModels = require('./technicalModels');

class PredictionEngine {
  constructor() {
    // Statistical models
    this.statistical = {
      linearRegression: statisticalModels.linearRegression.bind(statisticalModels),
      polynomialRegression: statisticalModels.polynomialRegression.bind(statisticalModels),
      exponentialRegression: statisticalModels.exponentialRegression.bind(statisticalModels),
      arima: statisticalModels.arima.bind(statisticalModels),
      sarima: statisticalModels.sarima.bind(statisticalModels),
      holtWinters: statisticalModels.holtWinters.bind(statisticalModels),
      prophet: statisticalModels.prophet.bind(statisticalModels)
    };

    // Machine learning models
    this.machineLearning = {
      lstm: machineLearningModels.lstm.bind(machineLearningModels),
      randomForest: machineLearningModels.randomForest.bind(machineLearningModels),
      gradientBoosting: machineLearningModels.gradientBoosting.bind(machineLearningModels),
      svm: machineLearningModels.svm.bind(machineLearningModels),
      ensemble: machineLearningModels.ensemble.bind(machineLearningModels)
    };

    // Technical models
    this.technical = {
      movingAverageCrossover: technicalModels.movingAverageCrossover.bind(technicalModels),
      bollingerBandWidth: technicalModels.bollingerBandWidth.bind(technicalModels),
      rsiDivergence: technicalModels.rsiDivergence.bind(technicalModels),
      macdHistogram: technicalModels.macdHistogram.bind(technicalModels),
      supportResistance: technicalModels.supportResistance.bind(technicalModels),
      volumeBased: technicalModels.volumeBased.bind(technicalModels)
    };

    // All models combined
    this.all = {
      ...this.statistical,
      ...this.machineLearning,
      ...this.technical
    };
  }

  /**
   * Run all prediction models on the data
   * @param {Array} data - Time series or OHLCV data
   * @param {object} options - Prediction options
   * @returns {Promise<object>} Combined prediction results
   */
  async predictAll(data, options = {}) {
    const {
      includeStatistical = true,
      includeMachineLearning = true,
      includeTechnical = true,
      forecastHorizon = 1
    } = options;

    const results = {};

    // Run statistical models
    if (includeStatistical) {
      try {
        results.statistical = await this._runStatisticalModels(data, forecastHorizon);
      } catch (error) {
        console.warn('Statistical models failed:', error.message);
        results.statistical = {};
      }
    }

    // Run machine learning models
    if (includeMachineLearning) {
      try {
        results.machineLearning = await this._runMachineLearningModels(data, forecastHorizon);
      } catch (error) {
        console.warn('Machine learning models failed:', error.message);
        results.machineLearning = {};
      }
    }

    // Run technical models
    if (includeTechnical) {
      try {
        results.technical = this._runTechnicalModels(data, forecastHorizon);
      } catch (error) {
        console.warn('Technical models failed:', error.message);
        results.technical = {};
      }
    }

    // Combine all predictions
    results.combined = this._combinePredictions(results, forecastHorizon);

    return results;
  }

  /**
   * Run statistical models
   */
  async _runStatisticalModels(data, forecastHorizon) {
    const results = {};

    // Convert data to time series format if needed
    const timeSeriesData = this._toTimeSeries(data);

    // Run each statistical model
    results.linear_regression = statisticalModels.linearRegression(timeSeriesData, {
      forecastHorizon
    });

    results.polynomial_regression = statisticalModels.polynomialRegression(timeSeriesData, {
      forecastHorizon,
      degree: 2
    });

    results.exponential_regression = statisticalModels.exponentialRegression(timeSeriesData, {
      forecastHorizon
    });

    try {
      results.arima = statisticalModels.arima(timeSeriesData, {
        forecastHorizon,
        p: 1,
        d: 1,
        q: 1
      });
    } catch (error) {
      results.arima = null;
    }

    try {
      results.holt_winters = statisticalModels.holtWinters(timeSeriesData, {
        forecastHorizon
      });
    } catch (error) {
      results.holt_winters = null;
    }

    return results;
  }

  /**
   * Run machine learning models
   */
  async _runMachineLearningModels(data, forecastHorizon) {
    const results = {};

    // Convert data to time series format if needed
    const timeSeriesData = this._toTimeSeries(data);

    try {
      results.lstm = await machineLearningModels.lstm(timeSeriesData, {
        forecastHorizon
      });
    } catch (error) {
      console.warn('LSTM prediction failed:', error.message);
      results.lstm = null;
    }

    try {
      results.random_forest = await machineLearningModels.randomForest(timeSeriesData, {
        forecastHorizon
      });
    } catch (error) {
      console.warn('Random Forest prediction failed:', error.message);
      results.random_forest = null;
    }

    try {
      results.gradient_boosting = await machineLearningModels.gradientBoosting(timeSeriesData, {
        forecastHorizon
      });
    } catch (error) {
      console.warn('Gradient Boosting prediction failed:', error.message);
      results.gradient_boosting = null;
    }

    try {
      results.svm = await machineLearningModels.svm(timeSeriesData, {
        forecastHorizon
      });
    } catch (error) {
      console.warn('SVM prediction failed:', error.message);
      results.svm = null;
    }

    return results;
  }

  /**
   * Run technical models
   */
  _runTechnicalModels(data, forecastHorizon) {
    const results = {};

    try {
      results.moving_average_crossover = technicalModels.movingAverageCrossover(data, {
        forecastHorizon,
        fastPeriod: 12,
        slowPeriod: 26
      });
    } catch (error) {
      results.moving_average_crossover = null;
    }

    try {
      results.bollinger_band_width = technicalModels.bollingerBandWidth(data, {
        forecastHorizon,
        period: 20,
        stdDev: 2
      });
    } catch (error) {
      results.bollinger_band_width = null;
    }

    try {
      results.rsi_divergence = technicalModels.rsiDivergence(data, {
        forecastHorizon,
        rsiPeriod: 14
      });
    } catch (error) {
      results.rsi_divergence = null;
    }

    try {
      results.macd_histogram = technicalModels.macdHistogram(data, {
        forecastHorizon,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      });
    } catch (error) {
      results.macd_histogram = null;
    }

    try {
      results.support_resistance = technicalModels.supportResistance(data, {
        forecastHorizon,
        lookbackPeriod: 20
      });
    } catch (error) {
      results.support_resistance = null;
    }

    try {
      results.volume_based = technicalModels.volumeBased(data, {
        forecastHorizon,
        lookbackPeriod: 20
      });
    } catch (error) {
      results.volume_based = null;
    }

    return results;
  }

  /**
   * Combine predictions from all models
   */
  _combinePredictions(results, forecastHorizon) {
    const allPredictions = [];
    const weights = {};

    // Collect predictions from all models
    for (const [category, categoryResults] of Object.entries(results)) {
      for (const [modelName, modelResult] of Object.entries(categoryResults)) {
        if (modelResult && modelResult.predictions) {
          // Store weight based on model type
          switch (category) {
            case 'statistical':
              weights[modelName] = 0.25;
              break;
            case 'machineLearning':
              weights[modelName] = 0.35;
              break;
            case 'technical':
              weights[modelName] = 0.40;
              break;
          }

          // Add predictions - only include non-null, non-NaN, non-zero predictions
          modelResult.predictions.forEach((pred, i) => {
            if (pred !== null && !isNaN(pred) && pred !== 0) {
              if (!allPredictions[i]) {
                allPredictions[i] = [];
              }
              allPredictions[i].push({ model: modelName, prediction: pred, weight: weights[modelName] });
            }
          });
        }
      }
    }

    // Calculate weighted average for each forecast point
    const combinedPredictions = allPredictions.map(predictions => {
      if (predictions.length === 0) {
        return null;
      }

      const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
      const weightedSum = predictions.reduce((sum, p) => sum + p.prediction * p.weight, 0);
      const average = weightedSum / totalWeight;

      return {
        average: average,
        min: Math.min(...predictions.map(p => p.prediction)),
        max: Math.max(...predictions.map(p => p.prediction)),
        count: predictions.length,
        models: predictions.map(p => p.model)
      };
    });

    return {
      predictions: combinedPredictions,
      forecastHorizon: forecastHorizon,
      modelCount: Object.keys(weights).length
    };
  }

  /**
   * Run a specific prediction model
   * @param {string} modelName - Name of the model to run
   * @param {Array} data - Input data
   * @param {object} options - Model options
   * @returns {Promise<object>} Prediction results
   */
  async predict(modelName, data, options = {}) {
    const allModels = this.getAvailableModels().all;

    if (!allModels.includes(modelName)) {
      throw new Error(`Model '${modelName}' not found. Available models: ${allModels.join(', ')}`);
    }

    // Convert data to appropriate format
    const timeSeriesData = this._toTimeSeries(data);

    if (this.all[modelName]) {
      return this.all[modelName](timeSeriesData || data, options);
    }

    throw new Error(`Model '${modelName}' is not callable`);
  }

  /**
   * Get list of all available prediction models
   * @returns {object} Available models grouped by category
   */
  getAvailableModels() {
    return {
      statistical: statisticalModels.getAvailableModels(),
      machineLearning: machineLearningModels.getAvailableModels(),
      technical: technicalModels.getAvailableModels(),
      all: [
        ...statisticalModels.getAvailableModels(),
        ...machineLearningModels.getAvailableModels(),
        ...technicalModels.getAvailableModels()
      ]
    };
  }

  /**
   * Convert data to time series format
   */
  _toTimeSeries(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Check if already in time series format
    if (data[0].value !== undefined && data[0].timestamp !== undefined) {
      return data;
    }

    // Assume OHLCV format, use close price
    return data.map((bar, index) => ({
      timestamp: bar.date || index,
      value: bar.close
    }));
  }

  /**
   * Calculate prediction confidence
   * @param {object} results - Prediction results from multiple models
   * @returns {number} Confidence score (0-100)
   */
  calculateConfidence(results) {
    // Count how many models agree on direction
    const directions = [];

    for (const [category, categoryResults] of Object.entries(results)) {
      for (const [modelName, modelResult] of Object.entries(categoryResults)) {
        if (modelResult && modelResult.predictions && modelResult.predictions.length > 0) {
          const lastPrice = modelResult.predictions[0];
          const firstPrice = modelResult.predictions[modelResult.predictions.length - 1];
          
          if (lastPrice > firstPrice) {
            directions.push('up');
          } else if (lastPrice < firstPrice) {
            directions.push('down');
          } else {
            directions.push('neutral');
          }
        }
      }
    }

    if (directions.length === 0) {
      return 50; // Neutral confidence
    }

    // Calculate agreement
    const upCount = directions.filter(d => d === 'up').length;
    const downCount = directions.filter(d => d === 'down').length;
    const neutralCount = directions.filter(d => d === 'neutral').length;

    const maxCount = Math.max(upCount, downCount, neutralCount);
    const agreementRatio = maxCount / directions.length;

    // Convert to confidence score (0-100)
    return Math.round(agreementRatio * 100);
  }

  /**
   * Generate trading signals from predictions
   * @param {object} results - Prediction results
   * @returns {object} Trading signals
   */
  generateSignals(results) {
    const signals = {
      buy: [],
      sell: [],
      hold: [],
      recommendation: 'hold',
      confidence: 0
    };

    // Analyze each model's predictions
    for (const [category, categoryResults] of Object.entries(results)) {
      for (const [modelName, modelResult] of Object.entries(categoryResults)) {
        if (modelResult && modelResult.predictions && modelResult.predictions.length > 0) {
          const currentPrice = modelResult.predictions[0];
          const futurePrice = modelResult.predictions[modelResult.predictions.length - 1];
          const change = (futurePrice - currentPrice) / currentPrice;

          if (change > 0.01) { // More than 1% increase
            signals.buy.push({ model: modelName, change: change });
          } else if (change < -0.01) { // More than 1% decrease
            signals.sell.push({ model: modelName, change: change });
          } else {
            signals.hold.push({ model: modelName, change: change });
          }
        }
      }
    }

    // Determine overall recommendation
    signals.confidence = this.calculateConfidence(results);

    if (signals.buy.length > signals.sell.length && signals.buy.length > signals.hold.length) {
      signals.recommendation = 'buy';
    } else if (signals.sell.length > signals.buy.length && signals.sell.length > signals.hold.length) {
      signals.recommendation = 'sell';
    } else {
      signals.recommendation = 'hold';
    }

    return signals;
  }
}

module.exports = new PredictionEngine();
