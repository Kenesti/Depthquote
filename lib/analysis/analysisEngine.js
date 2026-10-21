/**
 * Analysis Engine Module
 * Core engine that combines all components to provide comprehensive stock analysis
 */

const dataScraper = require('../data/dataScraper');
const dataProcessor = require('../data/dataProcessor');
const technicalIndicators = require('../indicators');
const patternRecognition = require('../patterns');
const predictionEngine = require('../prediction');
const { ANALYSIS_WEIGHTS, INDICATOR_THRESHOLDS } = require('../../config/constants');

class AnalysisEngine {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Main analysis method
   * @param {string|string[]} symbols - Stock symbol(s) to analyze
   * @param {object} options - Analysis options
   * @returns {Promise<object|object[]>} Analysis results
   */
  async analyze(symbols, options = {}) {
    const {
      period = '1y',
      interval = '1d',
      includeIndicators = true,
      includePatterns = true,
      includePredictions = true,
      includeRecommendations = true
    } = options;

    // Handle single symbol
    if (typeof symbols === 'string') {
      return this._analyzeSingleSymbol(symbols, {
        period,
        interval,
        includeIndicators,
        includePatterns,
        includePredictions,
        includeRecommendations
      });
    }

    // Handle multiple symbols
    const results = [];
    for (const symbol of symbols) {
      const result = await this._analyzeSingleSymbol(symbol, {
        period,
        interval,
        includeIndicators,
        includePatterns,
        includePredictions,
        includeRecommendations
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Analyze a single symbol
   */
  async _analyzeSingleSymbol(symbol, options) {
    const {
      period,
      interval,
      includeIndicators,
      includePatterns,
      includePredictions,
      includeRecommendations
    } = options;

    try {
      // Step 1: Fetch historical data
      const historicalData = await dataScraper.fetchHistoricalData(symbol, {
        period,
        interval
      });

      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      // Step 2: Process data
      const processedData = dataProcessor.processHistoricalData(historicalData);
      const dataWithChanges = dataProcessor.calculatePriceChanges(processedData);
      const dataWithReturns = dataProcessor.calculateReturns(dataWithChanges);
      const finalData = dataProcessor.calculateCumulativeReturns(dataWithReturns);

      // Step 3: Calculate technical indicators
      let dataWithIndicators = finalData;
      if (includeIndicators) {
        dataWithIndicators = await technicalIndicators.calculateAll(finalData);
      }

      // Step 4: Identify patterns
      let dataWithPatterns = dataWithIndicators;
      if (includePatterns) {
        dataWithPatterns = await patternRecognition.identifyAll(dataWithIndicators);
      }

      // Step 5: Generate predictions
      let predictions = null;
      if (includePredictions) {
        predictions = await predictionEngine.predictAll(dataWithPatterns, {
          forecastHorizon: 5 // Predict 5 periods ahead
        });
      }

      // Step 6: Generate recommendations
      let recommendations = null;
      if (includeRecommendations) {
        recommendations = this._generateRecommendations(
          dataWithPatterns,
          predictions,
          symbol
        );
      }

      // Step 7: Compile final result
      const result = {
        symbol: symbol.toUpperCase(),
        companyInfo: await this._getCompanyInfo(symbol),
        currentData: await this._getCurrentData(symbol),
        historicalData: dataWithPatterns,
        technicalAnalysis: this._extractTechnicalAnalysis(dataWithIndicators),
        patternAnalysis: includePatterns ? 
          this._extractPatternAnalysis(dataWithPatterns) : null,
        predictions: predictions,
        recommendations: recommendations,
        analysisDate: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(symbol, result);

      return result;
    } catch (error) {
      console.error(`Analysis error for ${symbol}:`, error.message);
      return {
        symbol: symbol.toUpperCase(),
        error: error.message,
        analysisDate: new Date().toISOString()
      };
    }
  }

  /**
   * Get company information
   */
  async _getCompanyInfo(symbol) {
    try {
      return await dataScraper.getCompanyInfo(symbol);
    } catch (error) {
      return { symbol: symbol.toUpperCase(), name: symbol };
    }
  }

  /**
   * Get current market data
   */
  async _getCurrentData(symbol) {
    try {
      return await dataScraper.getCurrentData(symbol);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract technical analysis from data with indicators
   */
  _extractTechnicalAnalysis(data) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastBar = data[data.length - 1];
    const analysis = {
      summary: this._calculateTechnicalSummary(lastBar),
      trend: this._calculateTrendAnalysis(data),
      momentum: this._calculateMomentumAnalysis(data),
      volatility: this._calculateVolatilityAnalysis(data),
      volume: this._calculateVolumeAnalysis(data),
      signals: this._calculateTechnicalSignals(data)
    };

    return analysis;
  }

  /**
   * Calculate technical summary with human-readable interpretations
   */
  _calculateTechnicalSummary(bar) {
    const summary = {
      price: bar.close,
      indicators: {},
      interpretations: {}
    };

    // Add key indicator values with interpretations
    if (bar.rsi !== undefined) {
      summary.indicators.rsi = bar.rsi;
      summary.indicators.rsiSignal = this._getRSISignal(bar.rsi);
      summary.interpretations.rsi = this._getRSIInterpretation(bar.rsi);
    }

    if (bar.macd !== undefined) {
      summary.indicators.macd = bar.macd;
      summary.indicators.macdSignal = bar.signal;
      summary.indicators.macdHistogram = bar.histogram;
      summary.indicators.macdSignalType = this._getMACDSignal(bar.macd, bar.signal);
      summary.interpretations.macd = this._getMACDInterpretation(bar.macd, bar.signal, bar.histogram);
    }

    if (bar.bb) {
      summary.indicators.bollingerBands = bar.bb;
      summary.indicators.bbSignal = this._getBBSignal(bar.close, bar.bb);
      summary.interpretations.bollingerBands = this._getBBInterpretation(bar.close, bar.bb);
    }

    if (bar.adx !== undefined) {
      summary.indicators.adx = bar.adx;
      summary.indicators.adxSignal = this._getADXSignal(bar.adx, bar.plusDi, bar.minusDi);
      summary.interpretations.adx = this._getADXInterpretation(bar.adx, bar.plusDi, bar.minusDi);
    }

    if (bar.stochastic !== undefined) {
      summary.indicators.stochastic = bar.stochastic;
      summary.interpretations.stochastic = this._getStochasticInterpretation(bar.stochastic.k, bar.stochastic.d);
    }

    if (bar.cci !== undefined) {
      summary.indicators.cci = bar.cci;
      summary.interpretations.cci = this._getCCIInterpretation(bar.cci);
    }

    return summary;
  }

  /**
   * Calculate trend analysis with interpretations
   */
  _calculateTrendAnalysis(data) {
    const analysis = {
      shortTerm: 'neutral',
      mediumTerm: 'neutral',
      longTerm: 'neutral',
      overall: 'neutral',
      interpretation: ''
    };

    const lastBar = data[data.length - 1];

    // Short-term trend (based on 20-day SMA)
    if (lastBar.sma && lastBar.close) {
      if (lastBar.close > lastBar.sma) {
        analysis.shortTerm = 'bullish';
      } else if (lastBar.close < lastBar.sma) {
        analysis.shortTerm = 'bearish';
      }
    }

    // Medium-term trend (based on 50-day SMA)
    if (lastBar.sma50 !== undefined && lastBar.close) {
      if (lastBar.close > lastBar.sma50) {
        analysis.mediumTerm = 'bullish';
      } else if (lastBar.close < lastBar.sma50) {
        analysis.mediumTerm = 'bearish';
      }
    }

    // Long-term trend (based on 200-day SMA)
    if (lastBar.sma200 !== undefined && lastBar.close) {
      if (lastBar.close > lastBar.sma200) {
        analysis.longTerm = 'bullish';
      } else if (lastBar.close < lastBar.sma200) {
        analysis.longTerm = 'bearish';
      }
    }

    // Overall trend
    const trends = [analysis.shortTerm, analysis.mediumTerm, analysis.longTerm];
    const bullishCount = trends.filter(t => t === 'bullish').length;
    const bearishCount = trends.filter(t => t === 'bearish').length;

    if (bullishCount > bearishCount) {
      analysis.overall = 'bullish';
    } else if (bearishCount > bullishCount) {
      analysis.overall = 'bearish';
    }

    // Generate human-readable interpretation
    analysis.interpretation = this._getTrendInterpretation(analysis);

    return analysis;
  }

  /**
   * Calculate momentum analysis with interpretations
   */
  _calculateMomentumAnalysis(data) {
    const analysis = {
      rsi: 'neutral',
      stochastic: 'neutral',
      macd: 'neutral',
      cci: 'neutral',
      overall: 'neutral',
      interpretation: ''
    };

    const lastBar = data[data.length - 1];

    // RSI
    if (lastBar.rsi !== undefined) {
      analysis.rsi = this._getRSISignal(lastBar.rsi);
    }

    // Stochastic
    if (lastBar.stochastic && lastBar.stochastic.k !== undefined) {
      analysis.stochastic = this._getStochasticSignal(lastBar.stochastic.k, lastBar.stochastic.d);
    }

    // MACD
    if (lastBar.macd !== undefined && lastBar.signal !== undefined) {
      analysis.macd = this._getMACDSignal(lastBar.macd, lastBar.signal);
    }

    // CCI
    if (lastBar.cci !== undefined) {
      analysis.cci = lastBar.cci > 0 ? 'bullish' : lastBar.cci < 0 ? 'bearish' : 'neutral';
    }

    // Overall momentum
    const signals = [analysis.rsi, analysis.stochastic, analysis.macd, analysis.cci];
    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;

    if (bullishCount > bearishCount) {
      analysis.overall = 'bullish';
    } else if (bearishCount > bullishCount) {
      analysis.overall = 'bearish';
    }

    // Generate interpretation
    analysis.interpretation = this._getMomentumInterpretation(analysis, lastBar);

    return analysis;
  }

  /**
   * Calculate volatility analysis with interpretations
   */
  _calculateVolatilityAnalysis(data) {
    const analysis = {
      current: 'normal',
      historical: 'normal',
      atr: 0,
      bbWidth: 0,
      interpretation: ''
    };

    const lastBar = data[data.length - 1];

    // ATR
    if (lastBar.atr !== undefined) {
      analysis.atr = lastBar.atr;
      // Compare to historical ATR
      const atrValues = data.filter(b => b.atr !== null).map(b => b.atr);
      if (atrValues.length > 0) {
        const avgATR = atrValues.reduce((sum, val) => sum + val, 0) / atrValues.length;
        const atrRatio = lastBar.atr / (avgATR || 1);
        
        if (lastBar.atr > avgATR * 1.5) {
          analysis.current = 'high';
        } else if (lastBar.atr < avgATR * 0.5) {
          analysis.current = 'low';
        }

        // Generate ATR interpretation
        if (atrRatio > 1.5) {
          analysis.interpretation = `ATR at ${(lastBar.atr || 0).toFixed(2)} is ${(atrRatio * 100 - 100).toFixed(0)}% above average. High volatility indicates larger price swings and increased risk.`;
        } else if (atrRatio < 0.5) {
          analysis.interpretation = `ATR at ${(lastBar.atr || 0).toFixed(2)} is ${(100 - atrRatio * 100).toFixed(0)}% below average. Low volatility suggests the stock is in a consolidation or low-activity period.`;
        } else {
          analysis.interpretation = `ATR at ${(lastBar.atr || 0).toFixed(2)} is near its average level. Normal volatility for this stock.`;
        }
      }
    }

    // Bollinger Band Width
    if (lastBar.bbWidth !== undefined) {
      analysis.bbWidth = lastBar.bbWidth;
      
      // Add BB width interpretation
      if (lastBar.bbWidth > 0.2) {
        analysis.interpretation += ` Bollinger Band width at (${((lastBar.bbWidth || 0) * 100).toFixed(1)}% indicates high volatility.`;
      } else if (lastBar.bbWidth < 0.05) {
        analysis.interpretation += ` Bollinger Band width at (${((lastBar.bbWidth || 0) * 100).toFixed(1)}% indicates a squeeze, suggesting a potential breakout.`;
      }
    }

    return analysis;
  }

  /**
   * Calculate volume analysis with interpretations
   */
  _calculateVolumeAnalysis(data) {
    const analysis = {
      current: 'normal',
      trend: 'neutral',
      obv: 'neutral',
      interpretation: ''
    };

    const lastBar = data[data.length - 1];

    // Volume trend
    if (data.length >= 20) {
      const recentVolumes = data.slice(-20).map(b => b.volume);
      const avgVolume = recentVolumes.reduce((sum, val) => sum + val, 0) / recentVolumes.length;
      const volumeRatio = lastBar.volume / (avgVolume || 1);
      
      if (lastBar.volume > avgVolume * 1.5) {
        analysis.current = 'high';
        analysis.interpretation = `Volume at ${(lastBar.volume || 0).toLocaleString()} is ${(((volumeRatio || 1) - 1) * 100).toFixed(0)}% above 20-day average. High volume confirms the price move.`;
      } else if (lastBar.volume < avgVolume * 0.5) {
        analysis.current = 'low';
        analysis.interpretation = `Volume at ${(lastBar.volume || 0).toLocaleString()} is ${((1 - volumeRatio) * 100).toFixed(0)}% below 20-day average. Low volume suggests lack of conviction in the price move.`;
      } else {
        analysis.interpretation = `Volume at ${(lastBar.volume || 0).toLocaleString()} is near the 20-day average. Normal trading activity.`;
      }
    }

    // OBV
    if (lastBar.obv !== undefined) {
      if (data.length >= 2) {
        const prevOBV = data[data.length - 2].obv;
        if (lastBar.obv > prevOBV) {
          analysis.obv = 'bullish';
          analysis.interpretation += ` OBV is rising, indicating accumulation (smart money buying).`;
        } else if (lastBar.obv < prevOBV) {
          analysis.obv = 'bearish';
          analysis.interpretation += ` OBV is falling, indicating distribution (smart money selling).`;
        }
      }
    }

    return analysis;
  }

  /**
   * Calculate technical signals
   */
  _calculateTechnicalSignals(data) {
    const signals = {
      buy: [],
      sell: [],
      hold: []
    };

    const lastBar = data[data.length - 1];

    // RSI signals
    if (lastBar.rsi !== undefined) {
      if (lastBar.rsi < INDICATOR_THRESHOLDS.RSI.OVERSOLD) {
        signals.buy.push({ indicator: 'RSI', value: lastBar.rsi, message: 'Oversold' });
      } else if (lastBar.rsi > INDICATOR_THRESHOLDS.RSI.OVERBOUGHT) {
        signals.sell.push({ indicator: 'RSI', value: lastBar.rsi, message: 'Overbought' });
      }
    }

    // MACD signals
    if (lastBar.macd !== undefined && lastBar.signal !== undefined) {
      if (lastBar.macd > lastBar.signal) {
        signals.buy.push({ indicator: 'MACD', value: lastBar.macd, message: 'Bullish crossover' });
      } else if (lastBar.macd < lastBar.signal) {
        signals.sell.push({ indicator: 'MACD', value: lastBar.macd, message: 'Bearish crossover' });
      }
    }

    // Bollinger Bands signals
    if (lastBar.bb) {
      if (lastBar.close <= lastBar.bb.lower) {
        signals.buy.push({ indicator: 'BB', value: lastBar.close, message: 'Below lower band' });
      } else if (lastBar.close >= lastBar.bb.upper) {
        signals.sell.push({ indicator: 'BB', value: lastBar.close, message: 'Above upper band' });
      }
    }

    // Stochastic signals
    if (lastBar.stochastic && lastBar.stochastic.k !== undefined) {
      if (lastBar.stochastic.k < 20 && lastBar.stochastic.d < 20) {
        signals.buy.push({ indicator: 'Stochastic', value: lastBar.stochastic.k, message: 'Oversold' });
      } else if (lastBar.stochastic.k > 80 && lastBar.stochastic.d > 80) {
        signals.sell.push({ indicator: 'Stochastic', value: lastBar.stochastic.k, message: 'Overbought' });
      }
    }

    return signals;
  }

  /**
   * Extract pattern analysis with interpretations
   */
  _extractPatternAnalysis(data) {
    if (!data || data.length === 0) {
      return null;
    }

    const analysis = {
      candlePatterns: {
        bullish: [],
        bearish: [],
        neutral: []
      },
      chartPatterns: {
        bullish: [],
        bearish: [],
        neutral: []
      },
      statistics: null,
      interpretation: ''
    };

    // Collect candle patterns
    data.forEach(bar => {
      if (bar.patterns) {
        bar.patterns.forEach(pattern => {
          analysis.candlePatterns[pattern.type].push(pattern);
        });
      }
    });

    // Collect chart patterns
    data.forEach(bar => {
      if (bar.chartPatterns) {
        bar.chartPatterns.forEach(pattern => {
          analysis.chartPatterns[pattern.type].push(pattern);
        });
      }
    });

    // Calculate statistics
    analysis.statistics = {
      candle: {
        total: analysis.candlePatterns.bullish.length + 
               analysis.candlePatterns.bearish.length + 
               analysis.candlePatterns.neutral.length,
        bullish: analysis.candlePatterns.bullish.length,
        bearish: analysis.candlePatterns.bearish.length,
        neutral: analysis.candlePatterns.neutral.length
      },
      chart: {
        total: analysis.chartPatterns.bullish.length + 
               analysis.chartPatterns.bearish.length + 
               analysis.chartPatterns.neutral.length,
        bullish: analysis.chartPatterns.bullish.length,
        bearish: analysis.chartPatterns.bearish.length,
        neutral: analysis.chartPatterns.neutral.length
      }
    };

    // Generate interpretation
    analysis.interpretation = this._getPatternInterpretation(analysis);

    return analysis;
  }

  /**
   * Generate recommendations with interpretations
   */
  _generateRecommendations(data, predictions, symbol) {
    const recommendations = {
      overall: {
        signal: 'neutral',
        strength: 0,
        confidence: 0,
        summary: ''
      },
      priceTargets: {
        buy: null,
        sell: null,
        interpretation: ''
      },
      riskMetrics: {
        stopLoss: null,
        takeProfit: null,
        riskRewardRatio: null,
        interpretation: ''
      },
      breakdown: {
        technical: { signal: 'neutral', weight: ANALYSIS_WEIGHTS.TECHNICAL_INDICATORS },
        patterns: { signal: 'neutral', weight: ANALYSIS_WEIGHTS.CANDLE_PATTERNS },
        predictions: { signal: 'neutral', weight: ANALYSIS_WEIGHTS.PREDICTION_MODELS },
        volume: { signal: 'neutral', weight: ANALYSIS_WEIGHTS.VOLUME_ANALYSIS }
      }
    };

    // Technical analysis signal
    const technicalSignals = this._calculateTechnicalSignals(data);
    recommendations.breakdown.technical.signal = this._getSignalFromCounts(
      technicalSignals.buy.length,
      technicalSignals.sell.length
    );

    // Pattern analysis signal
    const patternAnalysis = this._extractPatternAnalysis(data);
    if (patternAnalysis) {
      recommendations.breakdown.patterns.signal = this._getSignalFromCounts(
        patternAnalysis.statistics.candle.bullish + patternAnalysis.statistics.chart.bullish,
        patternAnalysis.statistics.candle.bearish + patternAnalysis.statistics.chart.bearish
      );
    }

    // Prediction signal
    if (predictions && predictions.combined) {
      const lastPrice = data[data.length - 1].close;
      const avgPrediction = predictions.combined.predictions[0]?.average || lastPrice;
      const change = (avgPrediction - lastPrice) / lastPrice;

      if (change > 0.01) {
        recommendations.breakdown.predictions.signal = 'bullish';
      } else if (change < -0.01) {
        recommendations.breakdown.predictions.signal = 'bearish';
      }
    }

    // Volume signal
    const volumeAnalysis = this._calculateVolumeAnalysis(data);
    if (volumeAnalysis.obv === 'bullish') {
      recommendations.breakdown.volume.signal = 'bullish';
    } else if (volumeAnalysis.obv === 'bearish') {
      recommendations.breakdown.volume.signal = 'bearish';
    }

    // Calculate overall signal with weights
    const signals = recommendations.breakdown;
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [key, value] of Object.entries(signals)) {
      const signalValue = this._signalToValue(value.signal);
      weightedSum += signalValue * value.weight;
      totalWeight += value.weight;
    }

    const overallSignalValue = weightedSum / totalWeight;
    recommendations.overall.signal = this._valueToSignal(overallSignalValue);
    recommendations.overall.strength = Math.abs(overallSignalValue);
    recommendations.overall.confidence = this._calculateConfidence(signals);

    // Calculate price targets
    const lastPrice = data[data.length - 1].close;
    recommendations.priceTargets.buy = this._calculateBuyTarget(data, predictions);
    recommendations.priceTargets.sell = this._calculateSellTarget(data, predictions);
    recommendations.priceTargets.interpretation = this._getPriceTargetInterpretation(
      lastPrice,
      recommendations.priceTargets.buy,
      recommendations.priceTargets.sell
    );

    // Calculate risk metrics
    recommendations.riskMetrics = this._calculateRiskMetrics(
      data,
      recommendations.priceTargets.buy,
      recommendations.priceTargets.sell
    );
    recommendations.riskMetrics.interpretation = this._getRiskMetricsInterpretation(
      recommendations.riskMetrics
    );

    // Generate overall summary
    recommendations.overall.summary = this._getOverallRecommendationSummary(
      recommendations,
      data
    );

    return recommendations;
  }

  /**
   * Get signal from buy/sell counts
   */
  _getSignalFromCounts(buyCount, sellCount) {
    if (buyCount > sellCount) {
      return 'bullish';
    } else if (sellCount > buyCount) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Convert signal to numeric value
   */
  _signalToValue(signal) {
    switch (signal) {
      case 'bullish': return 1;
      case 'bearish': return -1;
      default: return 0;
    }
  }

  /**
   * Convert numeric value to signal
   */
  _valueToSignal(value) {
    if (value > 0.2) return 'bullish';
    if (value < -0.2) return 'bearish';
    return 'neutral';
  }

  /**
   * Calculate confidence from signals
   */
  _calculateConfidence(signals) {
    const allSignals = Object.values(signals).map(s => s.signal);
    const bullishCount = allSignals.filter(s => s === 'bullish').length;
    const bearishCount = allSignals.filter(s => s === 'bearish').length;
    const total = allSignals.length;

    const maxCount = Math.max(bullishCount, bearishCount);
    return Math.round((maxCount / total) * 100);
  }

  /**
   * Calculate buy target
   */
  _calculateBuyTarget(data, predictions) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastPrice = data[data.length - 1].close;

    // Use support level if available
    if (data[data.length - 1].support) {
      return data[data.length - 1].support * 0.99; // 1% below support
    }

    // Use prediction if available
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const avgPrediction = predictions.combined.predictions[0].average;
      if (avgPrediction > lastPrice) {
        return lastPrice * 0.99; // 1% below current price
      }
    }

    // Default: 2% below current price
    return lastPrice * 0.98;
  }

  /**
   * Calculate sell target
   */
  _calculateSellTarget(data, predictions) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastPrice = data[data.length - 1].close;

    // Use resistance level if available
    if (data[data.length - 1].resistance) {
      return data[data.length - 1].resistance * 1.01; // 1% above resistance
    }

    // Use prediction if available
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const avgPrediction = predictions.combined.predictions[0].average;
      if (avgPrediction > lastPrice) {
        return avgPrediction * 1.01; // 1% above predicted price
      }
    }

    // Default: 2% above current price
    return lastPrice * 1.02;
  }

  /**
   * Calculate risk metrics
   */
  _calculateRiskMetrics(data, buyTarget, sellTarget) {
    if (!data || data.length === 0 || buyTarget === null || sellTarget === null) {
      return {
        stopLoss: null,
        takeProfit: null,
        riskRewardRatio: null
      };
    }

    const lastPrice = data[data.length - 1].close;

    // Calculate average true range for stop loss
    const atrValues = data.filter(b => b.atr !== null).map(b => b.atr);
    const avgATR = atrValues.length > 0 ? 
      atrValues.reduce((sum, val) => sum + val, 0) / atrValues.length : 0;

    // Stop loss: 1.5 * ATR below buy target
    const stopLoss = buyTarget - (avgATR * 1.5);

    // Take profit: sell target
    const takeProfit = sellTarget;

    // Risk/reward ratio
    const risk = buyTarget - stopLoss;
    const reward = takeProfit - buyTarget;
    const riskRewardRatio = risk > 0 ? reward / risk : null;

    return {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      riskRewardRatio: riskRewardRatio
    };
  }

  // Indicator signal helpers

  _getRSISignal(rsi) {
    if (rsi < INDICATOR_THRESHOLDS.RSI.OVERSOLD) {
      return 'bullish';
    } else if (rsi > INDICATOR_THRESHOLDS.RSI.OVERBOUGHT) {
      return 'bearish';
    }
    return 'neutral';
  }

  // Interpretation helpers

  /**
   * Get RSI interpretation
   */
  _getRSIInterpretation(rsi) {
    if (rsi === undefined || rsi === null) {
      return null;
    }

    if (rsi < 20) {
      return `Extremely oversold (${(rsi || 0).toFixed(1)}). Strong buying pressure expected as the stock is heavily oversold.`;
    } else if (rsi < 30) {
      return `Oversold (${(rsi || 0).toFixed(1)}). Potential buying opportunity as the stock may be due for a rebound.`;
    } else if (rsi < 45) {
      return `Weak but recovering (${(rsi || 0).toFixed(1)}). Momentum is building in the bullish direction.`;
    } else if (rsi < 55) {
      return `Neutral (${(rsi || 0).toFixed(1)}). No strong momentum signal in either direction.`;
    } else if (rsi < 70) {
      return `Weak but declining (${(rsi || 0).toFixed(1)}). Momentum is building in the bearish direction.`;
    } else if (rsi < 80) {
      return `Overbought (${(rsi || 0).toFixed(1)}). Potential selling opportunity as the stock may be due for a pullback.`;
    } else {
      return `Extremely overbought (${(rsi || 0).toFixed(1)}). Strong selling pressure expected as the stock is heavily overbought.`;
    }
  }

  _getMACDSignal(macd, signal) {
    if (macd > signal) {
      return 'bullish';
    } else if (macd < signal) {
      return 'bearish';
    }
    return 'neutral';
  }

  _getBBSignal(price, bb) {
    if (price <= bb.lower) {
      return 'bullish';
    } else if (price >= bb.upper) {
      return 'bearish';
    }
    return 'neutral';
  }

  _getADXSignal(adx, plusDi, minusDi) {
    if (adx > 25) {
      if (plusDi > minusDi) {
        return 'bullish';
      } else if (minusDi > plusDi) {
        return 'bearish';
      }
    }
    return 'neutral';
  }

  _getStochasticSignal(k, d) {
    if (k < 20 && d < 20) {
      return 'bullish';
    } else if (k > 80 && d > 80) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Get MACD interpretation
   */
  _getMACDInterpretation(macd, signal, histogram) {
    if (macd === undefined || signal === undefined) {
      return null;
    }

    const macdSignal = this._getMACDSignal(macd, signal);
    
    if (macdSignal === 'bullish') {
      if (histogram && histogram > 0) {
        return `Bullish crossover detected. MACD line (${(macd || 0).toFixed(2)}) crossed above signal line (${(signal || 0).toFixed(2)}). Momentum is shifting to the upside.`;
      }
      return `MACD above signal (${(macd || 0).toFixed(2)} vs ${(signal || 0).toFixed(2)}). Bullish momentum in play.`;
    } else if (macdSignal === 'bearish') {
      if (histogram && histogram < 0) {
        return `Bearish crossover detected. MACD line (${(macd || 0).toFixed(2)}) crossed below signal line (${(signal || 0).toFixed(2)}). Momentum is shifting to the downside.`;
      }
      return `MACD below signal (${(macd || 0).toFixed(2)} vs ${(signal || 0).toFixed(2)}). Bearish momentum in play.`;
    }
    return `MACD and signal lines are converging. No clear momentum signal at this time.`;
  }

  /**
   * Get Bollinger Bands interpretation
   */
  _getBBInterpretation(price, bb) {
    if (!bb || price === undefined) {
      return null;
    }

    const position = (price - bb.lower) / (bb.upper - bb.lower) * 100;
    const width = bb.width * 100;

    if (price <= bb.lower) {
      return `Price (${(price || 0).toFixed(2)}) is at or below the lower Bollinger Band (${(bb.lower || 0).toFixed(2)}). This is a potential oversold condition and buying opportunity.`;
    } else if (price >= bb.upper) {
      return `Price (${(price || 0).toFixed(2)}) is at or above the upper Bollinger Band (${(bb.upper || 0).toFixed(2)}). This is a potential overbought condition and selling opportunity.`;
    } else if (position < 20) {
      return `Price (${(price || 0).toFixed(2)}) is near the lower Bollinger Band (${(position || 0).toFixed(1)}% from bottom). Approaching oversold territory.`;
    } else if (position > 80) {
      return `Price (${(price || 0).toFixed(2)}) is near the upper Bollinger Band (${(position || 0).toFixed(1)}% from bottom). Approaching overbought territory.`;
    } else {
      return `Price (${(price || 0).toFixed(2)}) is in the middle of the Bollinger Bands (${(position || 0).toFixed(1)}% from bottom). Normal trading range.`;
    }
  }

  /**
   * Get ADX interpretation
   */
  _getADXInterpretation(adx, plusDi, minusDi) {
    if (adx === undefined) {
      return null;
    }

    if (adx < 20) {
      return `ADX at ${(adx || 0).toFixed(1)} indicates a weak or no trend. The market is ranging or consolidating.`;
    } else if (adx < 25) {
      return `ADX at ${(adx || 0).toFixed(1)} indicates a developing trend. Monitor for trend confirmation.`;
    } else if (adx < 50) {
      const direction = plusDi > minusDi ? 'bullish' : 'bearish';
      const strength = plusDi > minusDi ? plusDi.toFixed(1) : minusDi.toFixed(1);
      return `ADX at ${(adx || 0).toFixed(1)} indicates a strong ${direction} trend (DI: ${strength}). The trend has good momentum.`;
    } else if (adx < 75) {
      const direction = plusDi > minusDi ? 'bullish' : 'bearish';
      const strength = plusDi > minusDi ? plusDi.toFixed(1) : minusDi.toFixed(1);
      return `ADX at ${(adx || 0).toFixed(1)} indicates a very strong ${direction} trend (DI: ${strength}). The trend is well-established.`;
    } else {
      const direction = plusDi > minusDi ? 'bullish' : 'bearish';
      const strength = plusDi > minusDi ? plusDi.toFixed(1) : minusDi.toFixed(1);
      return `ADX at ${(adx || 0).toFixed(1)} indicates an extremely strong ${direction} trend (DI: ${strength}). The trend is very powerful.`;
    }
  }

  /**
   * Get Stochastic interpretation
   */
  _getStochasticInterpretation(k, d) {
    if (k === undefined || d === undefined) {
      return null;
    }

    if (k < 20 && d < 20) {
      return `Stochastic is oversold (%K: ${(k || 0).toFixed(1)}, %D: ${(d || 0).toFixed(1)}). Potential buying opportunity as momentum may be shifting upward.`;
    } else if (k > 80 && d > 80) {
      return `Stochastic is overbought (%K: ${(k || 0).toFixed(1)}, %D: ${(d || 0).toFixed(1)}). Potential selling opportunity as momentum may be shifting downward.`;
    } else if (k > d) {
      return `Stochastic %K (${(k || 0).toFixed(1)}) is above %D (${(d || 0).toFixed(1)}). Short-term momentum is bullish.`;
    } else if (k < d) {
      return `Stochastic %K (${(k || 0).toFixed(1)}) is below %D (${(d || 0).toFixed(1)}). Short-term momentum is bearish.`;
    }
    return `Stochastic %K (${(k || 0).toFixed(1)}) and %D (${(d || 0).toFixed(1)}) are converging. No clear momentum signal.`;
  }

  /**
   * Get CCI interpretation
   */
  _getCCIInterpretation(cci) {
    if (cci === undefined || cci === null) {
      return null;
    }

    if (cci > 100) {
      return `CCI at ${(cci || 0).toFixed(1)} indicates extreme bullish momentum. The stock is significantly above its average price.`;
    } else if (cci > 0) {
      return `CCI at ${(cci || 0).toFixed(1)} indicates bullish momentum. Price is above its average.`;
    } else if (cci > -100) {
      return `CCI at ${(cci || 0).toFixed(1)} indicates bearish momentum. Price is below its average.`;
    } else {
      return `CCI at ${(cci || 0).toFixed(1)} indicates extreme bearish momentum. The stock is significantly below its average price.`;
    }
  }

  /**
   * Get pattern interpretation
   */
  _getPatternInterpretation(patternAnalysis) {
    if (!patternAnalysis) {
      return 'No pattern analysis available.';
    }

    const { candle, chart } = patternAnalysis.statistics || { candle: {}, chart: {} };
    const totalPatterns = (candle.total || 0) + (chart.total || 0);

    if (totalPatterns === 0) {
      return 'No significant patterns detected in the recent price action.';
    }

    const bullishCount = (candle.bullish || 0) + (chart.bullish || 0);
    const bearishCount = (candle.bearish || 0) + (chart.bearish || 0);

    if (bullishCount > bearishCount) {
      const diff = bullishCount - bearishCount;
      if (diff > 5) {
        return `Strong bullish pattern bias detected with ${bullishCount} bullish patterns vs ${bearishCount} bearish patterns. Multiple confirmation signals suggest upward momentum.`;
      } else {
        return `Slight bullish pattern bias with ${bullishCount} bullish and ${bearishCount} bearish patterns. Some confirmation of upward potential.`;
      }
    } else if (bearishCount > bullishCount) {
      const diff = bearishCount - bullishCount;
      if (diff > 5) {
        return `Strong bearish pattern bias detected with ${bearishCount} bearish patterns vs ${bullishCount} bullish patterns. Multiple confirmation signals suggest downward momentum.`;
      } else {
        return `Slight bearish pattern bias with ${bearishCount} bearish and ${bullishCount} bullish patterns. Some confirmation of downward potential.`;
      }
    } else {
      return `Balanced pattern distribution with ${bullishCount} bullish and ${bearishCount} bearish patterns. No clear directional bias from patterns alone.`;
    }
  }

  /**
   * Get price target interpretation
   */
  _getPriceTargetInterpretation(currentPrice, buyTarget, sellTarget) {
    if (buyTarget === null || sellTarget === null) {
      return 'Price targets not available.';
    }

    const buyDiff = ((buyTarget - currentPrice) / currentPrice) * 100;
    const sellDiff = ((sellTarget - currentPrice) / currentPrice) * 100;

    return `Buy target at ${(buyTarget || 0).toFixed(2)} (${buyDiff > 0 ? '+' : ''}${(buyDiff || 0).toFixed(2)}%) provides entry point. Sell target at ${(sellTarget || 0).toFixed(2)} (${sellDiff > 0 ? '+' : ''}${(sellDiff || 0).toFixed(2)}%) offers exit strategy.`;
  }

  /**
   * Get risk metrics interpretation
   */
  _getRiskMetricsInterpretation(riskMetrics) {
    if (!riskMetrics || riskMetrics.stopLoss === null || riskMetrics.takeProfit === null) {
      return 'Risk metrics not available.';
    }

    const ratio = riskMetrics.riskRewardRatio || 0;

    if (ratio > 2) {
      return `Excellent risk/reward ratio of ${(ratio || 0).toFixed(2)}:1. Stop loss at ${(riskMetrics.stopLoss || 0).toFixed(2)}, take profit at ${(riskMetrics.takeProfit || 0).toFixed(2)}. Favorable trade setup.`;
    } else if (ratio > 1) {
      return `Good risk/reward ratio of ${(ratio || 0).toFixed(2)}:1. Stop loss at ${(riskMetrics.stopLoss || 0).toFixed(2)}, take profit at ${(riskMetrics.takeProfit || 0).toFixed(2)}. Acceptable trade setup.`;
    } else {
      return `Low risk/reward ratio of ${(ratio || 0).toFixed(2)}:1. Stop loss at ${(riskMetrics.stopLoss || 0).toFixed(2)}, take profit at ${(riskMetrics.takeProfit || 0).toFixed(2)}. Consider adjusting targets for better ratio.`;
    }
  }

  /**
   * Get overall recommendation summary
   */
  _getOverallRecommendationSummary(recommendations, data) {
    const { signal, confidence, strength } = recommendations.overall;
    const lastPrice = data[data.length - 1].close;
    const lastBar = data[data.length - 1];

    let summary = `Overall ${signal.toUpperCase()} signal with ${confidence}% confidence.`;

    // Add technical context
    if (lastBar.rsi !== undefined) {
      if (lastBar.rsi > 70) {
        summary += ` RSI is overbought (${(lastBar.rsi || 0).toFixed(1)}), suggesting a potential pullback.`;
      } else if (lastBar.rsi < 30) {
        summary += ` RSI is oversold (${(lastBar.rsi || 0).toFixed(1)}), suggesting a potential rebound.`;
      }
    }

    // Add trend context
    if (recommendations.breakdown.technical) {
      const trendAnalysis = this._calculateTrendAnalysis(data);
      if (trendAnalysis.overall !== 'neutral') {
        summary += ` Trend analysis shows ${trendAnalysis.overall} momentum.`;
      }
    }

    // Add volume context
    if (lastBar.volume) {
      const avgVolume = data.slice(-20).reduce((sum, b) => sum + b.volume, 0) / 20;
      const volumeRatio = lastBar.volume / (avgVolume || 1);
      if (volumeRatio > 1.5) {
        summary += ` High volume (${(volumeRatio || 0).toFixed(1)}x average) confirms the price action.`;
      } else if (volumeRatio < 0.5) {
        summary += ` Low volume (${(volumeRatio || 0).toFixed(1)}x average) suggests weak conviction.`;
      }
    }

    // Add action recommendation
    if (signal === 'bullish') {
      summary += ` Consider buying on dips or breakouts above resistance.`;
    } else if (signal === 'bearish') {
      summary += ` Consider selling on rallies or breakdowns below support.`;
    } else {
      summary += ` Consider waiting for clearer signals before taking action.`;
    }

    return summary;
  }

  /**
   * Get momentum interpretation
   */
  _getMomentumInterpretation(analysis, lastBar) {
    const bullishSignals = [];
    const bearishSignals = [];

    if (analysis.rsi === 'bullish') {
      bullishSignals.push('RSI');
    } else if (analysis.rsi === 'bearish') {
      bearishSignals.push('RSI');
    }

    if (analysis.stochastic === 'bullish') {
      bullishSignals.push('Stochastic');
    } else if (analysis.stochastic === 'bearish') {
      bearishSignals.push('Stochastic');
    }

    if (analysis.macd === 'bullish') {
      bullishSignals.push('MACD');
    } else if (analysis.macd === 'bearish') {
      bearishSignals.push('MACD');
    }

    if (analysis.cci === 'bullish') {
      bullishSignals.push('CCI');
    } else if (analysis.cci === 'bearish') {
      bearishSignals.push('CCI');
    }

    if (bullishSignals.length > bearishSignals.length) {
      return `Momentum is ${analysis.overall} with ${bullishSignals.length} bullish signals (${bullishSignals.join(', ')}) and ${bearishSignals.length} bearish signals. Overall momentum favors the upside.`;
    } else if (bearishSignals.length > bullishSignals.length) {
      return `Momentum is ${analysis.overall} with ${bullishSignals.length} bullish signals and ${bearishSignals.length} bearish signals (${bearishSignals.join(', ')}). Overall momentum favors the downside.`;
    } else {
      return `Momentum is neutral with ${bullishSignals.length} bullish and ${bearishSignals.length} bearish signals. No clear momentum direction at this time.`;
    }
  }

  /**
   * Get trend interpretation
   */
  _getTrendInterpretation(trendAnalysis) {
    const { shortTerm, mediumTerm, longTerm, overall } = trendAnalysis;

    if (overall === 'bullish') {
      const bullishCount = [shortTerm, mediumTerm, longTerm].filter(t => t === 'bullish').length;
      if (bullishCount === 3) {
        return `All timeframes (short, medium, long-term) are bullish. This is a strong uptrend across all periods.`;
      } else if (bullishCount === 2) {
        const neutralCount = [shortTerm, mediumTerm, longTerm].filter(t => t === 'neutral').length;
        return `Two out of three timeframes are bullish. The trend is predominantly upward with some consolidation.`;
      } else {
        return `The overall trend is bullish, though not all timeframes are aligned.`;
      }
    } else if (overall === 'bearish') {
      const bearishCount = [shortTerm, mediumTerm, longTerm].filter(t => t === 'bearish').length;
      if (bearishCount === 3) {
        return `All timeframes (short, medium, long-term) are bearish. This is a strong downtrend across all periods.`;
      } else if (bearishCount === 2) {
        return `Two out of three timeframes are bearish. The trend is predominantly downward with some consolidation.`;
      } else {
        return `The overall trend is bearish, though not all timeframes are aligned.`;
      }
    } else {
      return `The trend is neutral with mixed signals across different timeframes. The market may be in a consolidation or transition phase.`;
    }
  }

  /**
   * Get analysis summary with human-readable interpretations
   * @param {object} result - Full analysis result
   * @returns {object} Analysis summary
   */
  getSummary(result) {
    if (!result || result.error) {
      return {
        symbol: result.symbol,
        status: 'error',
        message: result.error
      };
    }

    const summary = {
      symbol: result.symbol,
      company: result.companyInfo.name || result.symbol,
      currentPrice: result.currentData?.price || result.historicalData[result.historicalData.length - 1].close,
      overallSignal: result.recommendations?.overall.signal || 'neutral',
      confidence: result.recommendations?.overall.confidence || 0,
      buyTarget: result.recommendations?.priceTargets.buy,
      sellTarget: result.recommendations?.priceTargets.sell,
      stopLoss: result.recommendations?.riskMetrics.stopLoss,
      takeProfit: result.recommendations?.riskMetrics.takeProfit,
      technical: result.technicalAnalysis?.summary,
      patterns: result.patternAnalysis?.statistics,
      prediction: result.predictions?.combined?.predictions[0]?.average,
      // Add interpretations
      interpretations: {
        technical: result.technicalAnalysis?.summary?.interpretations || {},
        trend: result.technicalAnalysis?.trend?.interpretation || '',
        momentum: result.technicalAnalysis?.momentum?.interpretation || '',
        volatility: result.technicalAnalysis?.volatility?.interpretation || '',
        volume: result.technicalAnalysis?.volume?.interpretation || '',
        patterns: result.patternAnalysis?.interpretation || '',
        priceTargets: result.recommendations?.priceTargets?.interpretation || '',
        riskMetrics: result.recommendations?.riskMetrics?.interpretation || '',
        overall: result.recommendations?.overall?.summary || ''
      }
    };

    return summary;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new AnalysisEngine();
