/**
 * Statistical Prediction Models Module
 * Implements various statistical and time series prediction methods
 */

const { PREDICTION_METHODS } = require('../../config/constants');

class StatisticalModels {
  constructor() {
    // Required libraries would be imported here
    // For now, we'll implement pure JavaScript versions
  }

  /**
   * Linear Regression prediction
   * @param {Array} data - Time series data (array of {timestamp, value} objects)
   * @param {object} options - Prediction options
   * @returns {object} Prediction results
   */
  linearRegression(data, options = {}) {
    const {
      forecastHorizon = 1,
      includeConfidence = true,
      confidenceLevel = 0.95
    } = options;

    if (!Array.isArray(data) || data.length < 2) {
      return this._createEmptyResult('linear_regression', forecastHorizon);
    }

    // Extract x (time) and y (value) values
    const x = data.map((point, index) => index);
    const y = data.map(point => point.value);

    // Calculate regression coefficients
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => 
      sum + Math.pow(val - (slope * x[i] + intercept), 2), 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Generate predictions
    const predictions = [];
    const lastX = x[x.length - 1];

    for (let i = 1; i <= forecastHorizon; i++) {
      const nextX = lastX + i;
      const predictedValue = slope * nextX + intercept;
      predictions.push(predictedValue);
    }

    // Calculate confidence intervals if requested
    let confidenceIntervals = [];
    if (includeConfidence) {
      // Calculate standard error of the estimate
      const standardError = Math.sqrt(ssResidual / (n - 2));
      const tValue = this._getTValue(confidenceLevel, n - 2);
      const marginOfError = tValue * standardError * Math.sqrt(1 + 1/n + 
        Math.pow(forecastHorizon, 2) / (x.reduce((sum, val) => sum + Math.pow(val - sumX/n, 2), 0)));

      confidenceIntervals = predictions.map(pred => ({
        lower: pred - marginOfError,
        upper: pred + marginOfError
      }));
    }

    return {
      method: 'linear_regression',
      type: 'statistical',
      coefficients: { slope, intercept },
      rSquared: rSquared,
      predictions: predictions,
      confidenceIntervals: confidenceIntervals,
      modelSummary: {
        n: n,
        slope: slope,
        intercept: intercept,
        rSquared: rSquared
      }
    };
  }

  /**
   * Polynomial Regression prediction
   * @param {Array} data - Time series data
   * @param {object} options - Prediction options
   * @returns {object} Prediction results
   */
  polynomialRegression(data, options = {}) {
    const {
      degree = 2,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < degree + 1) {
      return this._createEmptyResult('polynomial_regression', forecastHorizon);
    }

    // Extract x and y values
    const x = data.map((point, index) => index);
    const y = data.map(point => point.value);

    // Design matrix for polynomial regression
    const X = x.map(val => {
      const row = [];
      for (let d = 0; d <= degree; d++) {
        row.push(Math.pow(val, d));
      }
      return row;
    });

    // Solve for coefficients using normal equation: (X'X)^-1 X'y
    const coefficients = this._solvePolynomialRegression(X, y);

    // Generate predictions
    const predictions = [];
    const lastX = x[x.length - 1];

    for (let i = 1; i <= forecastHorizon; i++) {
      const nextX = lastX + i;
      let predictedValue = 0;
      for (let d = 0; d <= degree; d++) {
        predictedValue += coefficients[d] * Math.pow(nextX, d);
      }
      predictions.push(predictedValue);
    }

    return {
      method: 'polynomial_regression',
      type: 'statistical',
      degree: degree,
      coefficients: coefficients,
      predictions: predictions,
      modelSummary: {
        degree: degree,
        coefficients: coefficients
      }
    };
  }

  /**
   * Exponential Regression prediction
   * @param {Array} data - Time series data
   * @param {object} options - Prediction options
   * @returns {object} Prediction results
   */
  exponentialRegression(data, options = {}) {
    const {
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < 2) {
      return this._createEmptyResult('exponential_regression', forecastHorizon);
    }

    // Transform to natural log space
    const x = data.map((point, index) => index);
    const y = data.map(point => Math.log(point.value));

    // Perform linear regression on log-transformed data
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions = [];
    const lastX = x[x.length - 1];

    for (let i = 1; i <= forecastHorizon; i++) {
      const nextX = lastX + i;
      const predictedLogValue = slope * nextX + intercept;
      const predictedValue = Math.exp(predictedLogValue);
      predictions.push(predictedValue);
    }

    return {
      method: 'exponential_regression',
      type: 'statistical',
      coefficients: { slope, intercept },
      predictions: predictions,
      modelSummary: {
        slope: slope,
        intercept: intercept
      }
    };
  }

  /**
   * ARIMA (AutoRegressive Integrated Moving Average) model
   * Simplified implementation
   * @param {Array} data - Time series data
   * @param {object} options - ARIMA parameters (p, d, q)
   * @returns {object} Prediction results
   */
  arima(data, options = {}) {
    const {
      p = 1, // AR order
      d = 1, // Differencing order
      q = 1, // MA order
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < p + d + q + 1) {
      return this._createEmptyResult('arima', forecastHorizon);
    }

    // Extract values
    const values = data.map(point => point.value);

    // Apply differencing
    let differenced = [...values];
    for (let i = 0; i < d; i++) {
      differenced = this._difference(differenced);
    }

    // If we have AR component (p > 0)
    let arCoefficients = [];
    if (p > 0) {
      arCoefficients = this._estimateARCoefficients(differenced, p);
    }

    // If we have MA component (q > 0)
    let maCoefficients = [];
    let residuals = [];
    if (q > 0) {
      // First fit AR model to get residuals
      const arPredictions = this._arPredict(differenced, arCoefficients, p);
      residuals = differenced.map((val, i) => val - (arPredictions[i] || 0));
      maCoefficients = this._estimateMACoefficients(residuals, q);
    }

    // Generate predictions
    const predictions = this._arimaPredict(differenced, arCoefficients, maCoefficients, p, d, q, forecastHorizon);

    return {
      method: 'arima',
      type: 'time_series',
      parameters: { p, d, q },
      arCoefficients: arCoefficients,
      maCoefficients: maCoefficients,
      predictions: predictions,
      modelSummary: {
        p: p,
        d: d,
        q: q
      }
    };
  }

  /**
   * SARIMA (Seasonal ARIMA) model
   * @param {Array} data - Time series data
   * @param {object} options - SARIMA parameters
   * @returns {object} Prediction results
   */
  sarima(data, options = {}) {
    const {
      p = 1,
      d = 1,
      q = 1,
      seasonalP = 1,
      seasonalD = 1,
      seasonalQ = 1,
      seasonalPeriod = 12,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < seasonalPeriod * 2) {
      return this._createEmptyResult('sarima', forecastHorizon);
    }

    // For simplicity, we'll just use ARIMA for now
    // A full SARIMA implementation would be more complex
    const arimaResult = this.arima(data, { p, d, q, forecastHorizon });

    return {
      ...arimaResult,
      method: 'sarima',
      parameters: { p, d, q, seasonalP, seasonalD, seasonalQ, seasonalPeriod }
    };
  }

  /**
   * Holt-Winters Exponential Smoothing
   * @param {Array} data - Time series data
   * @param {object} options - Holt-Winters parameters
   * @returns {object} Prediction results
   */
  holtWinters(data, options = {}) {
    const {
      alpha = 0.3, // Level smoothing factor
      beta = 0.1,  // Trend smoothing factor
      gamma = 0.1, // Seasonal smoothing factor
      seasonalPeriod = 12,
      forecastHorizon = 1
    } = options;

    if (!Array.isArray(data) || data.length < seasonalPeriod * 2) {
      return this._createEmptyResult('holt_winters', forecastHorizon);
    }

    // Extract values
    const values = data.map(point => point.value);

    // Initialize components
    const n = values.length;
    const level = [values[0]];
    const trend = [values[1] - values[0]];
    const seasonal = [];

    // Initialize seasonal component
    for (let i = 0; i < seasonalPeriod; i++) {
      seasonal.push(values[i] / level[0]);
    }

    // Calculate initial level and trend
    for (let i = 1; i < seasonalPeriod; i++) {
      level.push((values[i] / seasonal[i]) - trend[i - 1]);
      trend.push((level[i] - level[i - 1]) + beta * (trend[i - 1] - (level[i] - level[i - 1])));
    }

    // Smoothing
    for (let i = seasonalPeriod; i < n; i++) {
      const prevLevel = level[i - 1];
      const prevTrend = trend[i - 1];
      const prevSeasonal = seasonal[i - seasonalPeriod];

      level.push(alpha * (values[i] / prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend));
      trend.push(beta * (level[i] - prevLevel) + (1 - beta) * prevTrend);
      seasonal.push(gamma * (values[i] / level[i]) + (1 - gamma) * prevSeasonal);
    }

    // Generate predictions
    const predictions = [];
    let currentLevel = level[level.length - 1];
    let currentTrend = trend[trend.length - 1];

    for (let i = 1; i <= forecastHorizon; i++) {
      const seasonalIndex = (n + i - 1) % seasonalPeriod;
      const currentSeasonal = seasonal[seasonalIndex];

      const predictedValue = (currentLevel + i * currentTrend) * currentSeasonal;
      predictions.push(predictedValue);

      // Update components for next prediction
      currentLevel = currentLevel + currentTrend;
      // Note: In a full implementation, we'd also update trend and seasonal
    }

    return {
      method: 'holt_winters',
      type: 'time_series',
      parameters: { alpha, beta, gamma, seasonalPeriod },
      predictions: predictions,
      components: {
        level: level,
        trend: trend,
        seasonal: seasonal
      },
      modelSummary: {
        alpha: alpha,
        beta: beta,
        gamma: gamma,
        seasonalPeriod: seasonalPeriod
      }
    };
  }

  /**
   * Prophet-like model (simplified)
   * @param {Array} data - Time series data
   * @param {object} options - Model options
   * @returns {object} Prediction results
   */
  prophet(data, options = {}) {
    const {
      forecastHorizon = 1,
      seasonalPeriod = 7,
      trendChangepoints = 5
    } = options;

    if (!Array.isArray(data) || data.length < seasonalPeriod * 2) {
      return this._createEmptyResult('prophet', forecastHorizon);
    }

    // For simplicity, we'll use linear regression with seasonality
    const linearResult = this.linearRegression(data, { forecastHorizon });

    // Add seasonality component
    const values = data.map(point => point.value);
    const n = values.length;

    // Calculate average seasonal pattern
    const seasonalPattern = [];
    for (let i = 0; i < seasonalPeriod; i++) {
      const indices = [];
      for (let j = i; j < n; j += seasonalPeriod) {
        indices.push(j);
      }
      const avg = indices.reduce((sum, idx) => sum + values[idx], 0) / indices.length;
      seasonalPattern.push(avg);
    }

    // Normalize seasonal pattern
    const seasonalMean = seasonalPattern.reduce((sum, val) => sum + val, 0) / seasonalPeriod;
    const normalizedSeasonal = seasonalPattern.map(val => val - seasonalMean);

    // Generate predictions with seasonality
    const predictions = linearResult.predictions.map((pred, i) => {
      const seasonalIndex = (n + i) % seasonalPeriod;
      return pred + normalizedSeasonal[seasonalIndex];
    });

    return {
      ...linearResult,
      method: 'prophet',
      type: 'time_series',
      seasonalPattern: normalizedSeasonal,
      predictions: predictions,
      modelSummary: {
        ...linearResult.modelSummary,
        seasonalPeriod: seasonalPeriod
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
      type: method.includes('arima') || method.includes('holt') || method.includes('prophet') ? 'time_series' : 'statistical',
      predictions: new Array(forecastHorizon).fill(null),
      modelSummary: {}
    };
  }

  /**
   * Get t-value for confidence interval
   */
  _getTValue(confidenceLevel, degreesOfFreedom) {
    // Simplified t-value approximation
    // For large degrees of freedom, t-value approaches z-value
    const zValue = this._getZValue(confidenceLevel);
    
    // Adjust for degrees of freedom
    if (degreesOfFreedom > 30) {
      return zValue;
    }

    // Simple approximation for small degrees of freedom
    return zValue * (1 + 0.5 / degreesOfFreedom);
  }

  /**
   * Get z-value for confidence interval
   */
  _getZValue(confidenceLevel) {
    // Common z-values for confidence levels
    const zTable = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };

    return zTable[confidenceLevel] || 1.96; // Default to 95%
  }

  /**
   * Solve polynomial regression using normal equations
   */
  _solvePolynomialRegression(X, y) {
    const n = X.length;
    const degree = X[0].length - 1;

    // Build X'X matrix
    const XtX = [];
    for (let i = 0; i <= degree; i++) {
      XtX[i] = [];
      for (let j = 0; j <= degree; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][i] * X[k][j];
        }
        XtX[i][j] = sum;
      }
    }

    // Build X'y vector
    const Xty = [];
    for (let i = 0; i <= degree; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * y[k];
      }
      Xty.push(sum);
    }

    // Solve XtX * beta = Xty using Gaussian elimination
    const coefficients = this._solveLinearSystem(XtX, Xty);

    return coefficients;
  }

  /**
   * Solve linear system using Gaussian elimination
   */
  _solveLinearSystem(A, b) {
    const n = A.length;

    // Augmented matrix
    const M = A.map(row => [...row]);
    for (let i = 0; i < n; i++) {
      M[i].push(b[i]);
    }

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Partial pivoting
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      // Eliminate
      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      x[i] /= M[i][i];
    }

    return x;
  }

  /**
   * Difference a time series
   */
  _difference(series) {
    const differenced = [];
    for (let i = 1; i < series.length; i++) {
      differenced.push(series[i] - series[i - 1]);
    }
    return differenced;
  }

  /**
   * Estimate AR coefficients using Yule-Walker equations
   */
  _estimateARCoefficients(series, p) {
    const n = series.length;
    if (n <= p) {
      return new Array(p).fill(0);
    }

    // Calculate autocorrelation
    const mean = series.reduce((sum, val) => sum + val, 0) / n;
    const centered = series.map(val => val - mean);

    const autocorr = [];
    for (let k = 0; k <= p; k++) {
      let sum = 0;
      for (let i = 0; i < n - k; i++) {
        sum += centered[i] * centered[i + k];
      }
      autocorr.push(sum / n);
    }

    // Build Yule-Walker matrix
    const R = [];
    for (let i = 0; i < p; i++) {
      R[i] = [];
      for (let j = 0; j < p; j++) {
        R[i][j] = autocorr[Math.abs(i - j)];
      }
    }

    const r = autocorr.slice(1, p + 1);

    // Solve R * phi = r
    const coefficients = this._solveLinearSystem(R, r);

    return coefficients;
  }

  /**
   * AR prediction
   */
  _arPredict(series, coefficients, p) {
    const n = series.length;
    const predictions = new Array(n).fill(null);

    for (let i = p; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < p; j++) {
        pred += coefficients[j] * series[i - 1 - j];
      }
      predictions[i] = pred;
    }

    return predictions;
  }

  /**
   * Estimate MA coefficients
   */
  _estimateMACoefficients(residuals, q) {
    // Simplified: just return zeros for now
    return new Array(q).fill(0);
  }

  /**
   * ARIMA prediction
   */
  _arimaPredict(differenced, arCoeffs, maCoeffs, p, d, q, horizon) {
    const predictions = [];
    const n = differenced.length;

    // For simplicity, we'll just use the last value
    const lastValue = differenced[n - 1];
    
    for (let i = 0; i < horizon; i++) {
      // In a full implementation, we'd use the AR and MA components
      predictions.push(lastValue);
    }

    // If we differenced, we need to "undifference"
    if (d > 0) {
      // This is a simplified approach
      const original = [differenced[0]];
      for (let i = 1; i < n; i++) {
        original.push(original[i - 1] + differenced[i]);
      }

      const lastOriginal = original[n - 1];
      return predictions.map((pred, i) => lastOriginal + pred * (i + 1));
    }

    return predictions;
  }

  /**
   * Get list of available statistical models
   * @returns {Array} Available model names
   */
  getAvailableModels() {
    return PREDICTION_METHODS.STATISTICAL.concat(PREDICTION_METHODS.TIME_SERIES);
  }
}

module.exports = new StatisticalModels();
