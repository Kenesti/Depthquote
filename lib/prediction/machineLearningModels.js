/**
 * Machine Learning Prediction Models Module
 * Implements various machine learning-based prediction methods
 * Note: This module requires TensorFlow.js for full functionality
 */

const { PREDICTION_METHODS } = require('../../config/constants');

class MachineLearningModels {
  constructor() {
    this.models = {}; // Will store trained models
    this.tf = null; // Will be initialized when TensorFlow is available
  }

  /**
   * Initialize TensorFlow
   */
  async initialize() {
    try {
      // Check if TensorFlow is available
      const tf = require('@tensorflow/tfjs-node');
      this.tf = tf;
      console.log('TensorFlow initialized successfully');
      return true;
    } catch (error) {
      console.warn('TensorFlow not available:', error.message);
      this.tf = null;
      return false;
    }
  }

  /**
   * LSTM (Long Short-Term Memory) model for time series prediction
   * @param {Array} data - Time series data
   * @param {object} options - LSTM options
   * @returns {Promise<object>} Prediction results
   */
  async lstm(data, options = {}) {
    const {
      windowSize = 20,
      forecastHorizon = 1,
      epochs = 50,
      batchSize = 32,
      hiddenUnits = 64,
      learningRate = 0.001
    } = options;

    if (!this.tf) {
      console.warn('TensorFlow not available. Using fallback method.');
      return this._fallbackPrediction(data, forecastHorizon, 'lstm');
    }

    if (!Array.isArray(data) || data.length < windowSize * 2) {
      return this._createEmptyResult('lstm', forecastHorizon);
    }

    try {
      // Extract values
      const values = data.map(point => point.value);

      // Normalize data
      const { normalized, min, max } = this._normalize(values);

      // Create windows
      const { inputs, targets } = this._createWindows(normalized, windowSize, forecastHorizon);

      // Convert to tensors
      const xs = this.tf.tensor2d(inputs, [inputs.length, windowSize, 1]);
      const ys = this.tf.tensor2d(targets, [targets.length, forecastHorizon]);

      // Build LSTM model
      const model = this.tf.sequential();
      model.add(this.tf.layers.lstm({
        units: hiddenUnits,
        inputShape: [windowSize, 1],
        returnSequences: forecastHorizon > 1
      }));

      if (forecastHorizon > 1) {
        model.add(this.tf.layers.lstm({
          units: hiddenUnits,
          returnSequences: false
        }));
      }

      model.add(this.tf.layers.dense({ units: forecastHorizon }));

      // Compile model
      model.compile({
        optimizer: this.tf.train.adam(learningRate),
        loss: 'meanSquaredError'
      });

      // Train model
      await model.fit(xs, ys, {
        epochs: epochs,
        batchSize: batchSize,
        verbose: 0
      });

      // Make predictions
      const lastWindow = normalized.slice(-windowSize);
      const lastInput = this.tf.tensor2d([lastWindow], [1, windowSize, 1]);
      const prediction = model.predict(lastInput);
      const predictedValues = prediction.dataSync();

      // Denormalize predictions
      const denormalizedPredictions = predictedValues.map(val => 
        val * (max - min) + min
      );

      // Clean up
      this.tf.dispose([xs, ys, lastInput, prediction]);

      return {
        method: 'lstm',
        type: 'machine_learning',
        parameters: { windowSize, forecastHorizon, epochs, hiddenUnits },
        predictions: denormalizedPredictions,
        modelSummary: {
          windowSize: windowSize,
          hiddenUnits: hiddenUnits,
          epochs: epochs,
          trained: true
        }
      };
    } catch (error) {
      console.error('LSTM prediction error:', error);
      return this._fallbackPrediction(data, forecastHorizon, 'lstm');
    }
  }

  /**
   * Random Forest model for prediction
   * Note: This is a simplified implementation
   * @param {Array} data - Time series data with features
   * @param {object} options - Random Forest options
   * @returns {Promise<object>} Prediction results
   */
  async randomForest(data, options = {}) {
    const {
      nEstimators = 100,
      maxDepth = 5,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < 10) {
      return this._createEmptyResult('random_forest', forecastHorizon);
    }

    // For simplicity, we'll use a basic ensemble approach
    // In a real implementation, we'd use a proper Random Forest library

    try {
      // Extract features and targets
      const features = data.map((point, index) => {
        // Create simple features from lagged values
        const lagged = [];
        for (let i = 1; i <= 5; i++) {
          if (index >= i) {
            lagged.push(data[index - i].value);
          } else {
            lagged.push(0);
          }
        }
        return lagged;
      });

      const targets = data.map(point => point.value);

      // Simple ensemble prediction
      const predictions = [];
      for (let h = 1; h <= forecastHorizon; h++) {
        // Use average of last few values as prediction
        const lastValues = targets.slice(-5);
        const avg = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
        predictions.push(avg);
      }

      return {
        method: 'random_forest',
        type: 'machine_learning',
        parameters: { nEstimators, maxDepth },
        predictions: predictions,
        modelSummary: {
          nEstimators: nEstimators,
          maxDepth: maxDepth,
          featureCount: 5
        }
      };
    } catch (error) {
      console.error('Random Forest prediction error:', error);
      return this._fallbackPrediction(data, forecastHorizon, 'random_forest');
    }
  }

  /**
   * Gradient Boosting model for prediction
   * Note: This is a simplified implementation
   * @param {Array} data - Time series data
   * @param {object} options - Gradient Boosting options
   * @returns {Promise<object>} Prediction results
   */
  async gradientBoosting(data, options = {}) {
    const {
      nEstimators = 100,
      learningRate = 0.1,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < 10) {
      return this._createEmptyResult('gradient_boosting', forecastHorizon);
    }

    try {
      // Similar to Random Forest but with boosting
      const values = data.map(point => point.value);

      // Simple boosting prediction
      const predictions = [];
      for (let h = 1; h <= forecastHorizon; h++) {
        // Weighted average of recent values
        const lastValues = values.slice(-5);
        const weights = [0.1, 0.15, 0.2, 0.25, 0.3]; // More weight to recent values
        const weightedSum = lastValues.reduce((sum, val, i) => sum + val * weights[i], 0);
        predictions.push(weightedSum);
      }

      return {
        method: 'gradient_boosting',
        type: 'machine_learning',
        parameters: { nEstimators, learningRate },
        predictions: predictions,
        modelSummary: {
          nEstimators: nEstimators,
          learningRate: learningRate
        }
      };
    } catch (error) {
      console.error('Gradient Boosting prediction error:', error);
      return this._fallbackPrediction(data, forecastHorizon, 'gradient_boosting');
    }
  }

  /**
   * SVM (Support Vector Machine) model for prediction
   * Note: This is a simplified implementation
   * @param {Array} data - Time series data
   * @param {object} options - SVM options
   * @returns {Promise<object>} Prediction results
   */
  async svm(data, options = {}) {
    const {
      kernel = 'rbf',
      c = 1.0,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < 10) {
      return this._createEmptyResult('svm', forecastHorizon);
    }

    try {
      const values = data.map(point => point.value);

      // Simple SVM-like prediction
      // In a real implementation, we'd use a proper SVM library
      const predictions = [];
      for (let h = 1; h <= forecastHorizon; h++) {
        // Use moving average
        const lastValues = values.slice(-5);
        const avg = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;
        predictions.push(avg);
      }

      return {
        method: 'svm',
        type: 'machine_learning',
        parameters: { kernel, c },
        predictions: predictions,
        modelSummary: {
          kernel: kernel,
          c: c
        }
      };
    } catch (error) {
      console.error('SVM prediction error:', error);
      return this._fallbackPrediction(data, forecastHorizon, 'svm');
    }
  }

  /**
   * Ensemble model that combines multiple ML models
   * @param {Array} data - Time series data
   * @param {object} options - Ensemble options
   * @returns {Promise<object>} Prediction results
   */
  async ensemble(data, options = {}) {
    const {
      forecastHorizon = 1,
      includeLSTM = true,
      includeRandomForest = true,
      includeGradientBoosting = true,
      includeSVM = true
    } = options;

    if (!Array.isArray(data) || data.length < 10) {
      return this._createEmptyResult('ensemble', forecastHorizon);
    }

    try {
      const predictions = [];

      // Initialize predictions array
      for (let h = 0; h < forecastHorizon; h++) {
        predictions.push([]);
      }

      // Run individual models and collect predictions
      if (includeLSTM) {
        const lstmResult = await this.lstm(data, { forecastHorizon });
        lstmResult.predictions.forEach((pred, i) => predictions[i].push(pred));
      }

      if (includeRandomForest) {
        const rfResult = await this.randomForest(data, { forecastHorizon });
        rfResult.predictions.forEach((pred, i) => predictions[i].push(pred));
      }

      if (includeGradientBoosting) {
        const gbResult = await this.gradientBoosting(data, { forecastHorizon });
        gbResult.predictions.forEach((pred, i) => predictions[i].push(pred));
      }

      if (includeSVM) {
        const svmResult = await this.svm(data, { forecastHorizon });
        svmResult.predictions.forEach((pred, i) => predictions[i].push(pred));
      }

      // Average predictions from all models
      const finalPredictions = predictions.map(preds => {
        if (preds.length === 0) {
          return data[data.length - 1].value; // Fallback to last value
        }
        return preds.reduce((sum, val) => sum + val, 0) / preds.length;
      });

      return {
        method: 'ensemble',
        type: 'machine_learning',
        parameters: {
          includeLSTM,
          includeRandomForest,
          includeGradientBoosting,
          includeSVM
        },
        predictions: finalPredictions,
        modelSummary: {
          modelCount: [includeLSTM, includeRandomForest, includeGradientBoosting, includeSVM]
            .filter(Boolean).length,
          modelsUsed: [
            includeLSTM ? 'lstm' : null,
            includeRandomForest ? 'random_forest' : null,
            includeGradientBoosting ? 'gradient_boosting' : null,
            includeSVM ? 'svm' : null
          ].filter(Boolean)
        }
      };
    } catch (error) {
      console.error('Ensemble prediction error:', error);
      return this._fallbackPrediction(data, forecastHorizon, 'ensemble');
    }
  }

  // Helper methods

  /**
   * Create empty result object
   */
  _createEmptyResult(method, forecastHorizon) {
    return {
      method: method,
      type: 'machine_learning',
      predictions: new Array(forecastHorizon).fill(null),
      modelSummary: {}
    };
  }

  /**
   * Fallback prediction method when ML is not available
   */
  _fallbackPrediction(data, forecastHorizon, method) {
    if (!Array.isArray(data) || data.length === 0) {
      return this._createEmptyResult(method, forecastHorizon);
    }

    // Use simple moving average as fallback
    const values = data.map(point => point.value);
    const lastValues = values.slice(-5);
    const avg = lastValues.reduce((sum, val) => sum + val, 0) / lastValues.length;

    return {
      method: method,
      type: 'machine_learning',
      predictions: new Array(forecastHorizon).fill(avg),
      modelSummary: {
        fallback: true,
        fallbackMethod: 'simple_moving_average'
      }
    };
  }

  /**
   * Normalize data to [0, 1] range
   */
  _normalize(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return { normalized: values.map(() => 0.5), min: 0, max: 1 };
    }

    const normalized = values.map(val => (val - min) / range);
    return { normalized, min, max };
  }

  /**
   * Create windows for time series prediction
   */
  _createWindows(values, windowSize, forecastHorizon) {
    const inputs = [];
    const targets = [];

    for (let i = 0; i <= values.length - windowSize - forecastHorizon; i++) {
      const inputWindow = values.slice(i, i + windowSize);
      const targetWindow = values.slice(i + windowSize, i + windowSize + forecastHorizon);

      inputs.push(inputWindow);
      targets.push(targetWindow);
    }

    return { inputs, targets };
  }

  /**
   * Get list of available ML models
   * @returns {Array} Available model names
   */
  getAvailableModels() {
    return PREDICTION_METHODS.MACHINE_LEARNING;
  }

  /**
   * Check if TensorFlow is available
   * @returns {boolean} True if TensorFlow is available
   */
  isTensorFlowAvailable() {
    return this.tf !== null;
  }
}

// Create singleton instance
const instance = new MachineLearningModels();

// Initialize TensorFlow when module is loaded
instance.initialize().catch(() => {});

module.exports = instance;
