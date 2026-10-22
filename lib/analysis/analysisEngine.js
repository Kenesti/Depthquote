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
          symbol,
          patternAnalysis
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

    // Calculate price targets using enhanced strategy
    const lastPrice = data[data.length - 1].close;
    recommendations.priceTargets.buy = this._calculateBuyTarget(data, predictions, patternAnalysis);
    recommendations.priceTargets.sell = this._calculateSellTarget(data, predictions, patternAnalysis);
    recommendations.priceTargets.interpretation = this._getPriceTargetInterpretation(
      lastPrice,
      recommendations.priceTargets.buy,
      recommendations.priceTargets.sell
    );

    // Calculate risk metrics using enhanced strategy
    recommendations.riskMetrics = this._calculateRiskMetrics(
      data,
      recommendations.priceTargets.buy,
      recommendations.priceTargets.sell,
      patternAnalysis
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
   * Calculate buy target using enhanced strategy
   * Priority: 1) Pattern confirmation, 2) Support with volume, 3) Breakout, 4) Prediction, 5) Pullback
   */
  _calculateBuyTarget(data, predictions, patternAnalysis) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastBar = data[data.length - 1];
    const lastPrice = lastBar.close;
    const avgVolume = this._getAverageVolume(data);
    const atr = this._getCurrentATR(data);

    // ===================================================================
    // Priority 1: Pattern-based entries (highest probability)
    // ===================================================================
    if (patternAnalysis && patternAnalysis.candlePatterns) {
      // Check for confirmed bullish patterns with entry points
      const bullishPatterns = patternAnalysis.candlePatterns.bullish || [];
      
      for (const pattern of bullishPatterns) {
        // Confirmed patterns with defined entry points
        if (pattern.confirmed && pattern.entryPrice) {
          // Add small buffer above entry for safety
          return pattern.entryPrice * 1.002;
        }
        
        // Specific pattern types with known entry strategies
        switch (pattern.name) {
          case 'hammer':
          case 'inverted_hammer':
            // Buy at close of hammer candle + small buffer
            return lastPrice * 1.003;
            
          case 'bullish_engulfing':
            // Buy at high of engulfing candle
            return Math.max(lastPrice, lastBar.high) * 1.001;
            
          case 'piercing_line':
            // Buy at midpoint of piercing range
            return (lastBar.low + lastBar.high) / 2;
            
          case 'morning_star':
            // Buy above middle candle high
            if (data.length >= 3) {
              return data[data.length - 2].high * 1.002;
            }
            break;
            
          case 'three_white_soldiers':
            // Buy on break above third soldier high
            if (data.length >= 3) {
              return Math.max(
                data[data.length - 1].high,
                data[data.length - 2].high,
                data[data.length - 3].high
              ) * 1.001;
            }
            break;
            
          case 'bullish_harami':
            // Buy at mother candle close
            if (data.length >= 2) {
              return data[data.length - 2].close * 1.002;
            }
            break;
        }
      }
    }

    // ===================================================================
    // Priority 2: Support zone with volume confirmation
    // ===================================================================
    if (lastBar.support) {
      const volumeMultiplier = lastBar.volume / (avgVolume || 1);
      
      // Strong support with high volume
      if (volumeMultiplier > 1.5 && lastPrice <= lastBar.support * 1.01) {
        return lastBar.support * 1.003; // Slightly above support with volume
      }
      
      // Regular support
      if (lastPrice <= lastBar.support * 1.02) {
        return lastBar.support * 1.002; // Slightly above support
      }
      
      // Support retest
      return lastBar.support * 0.998; // Just below support for retest
    }

    // ===================================================================
    // Priority 3: Breakout entries
    // ===================================================================
    if (lastBar.upperBand && lastPrice > lastBar.upperBand) {
      const volumeMultiplier = lastBar.volume / (avgVolume || 1);
      
      if (volumeMultiplier > 1.5) {
        // Confirmed breakout with volume
        return lastPrice * 1.001; // Just above breakout
      }
    }

    // ===================================================================
    // Priority 4: Pullback to moving average
    // ===================================================================
    if (lastBar.sma20 && lastPrice < lastBar.sma20 && lastBar.sma20 < lastPrice * 1.01) {
      return lastBar.sma20 * 1.002; // Just above SMA20
    }

    if (lastBar.ema20 && lastPrice < lastBar.ema20 && lastBar.ema20 < lastPrice * 1.01) {
      return lastBar.ema20 * 1.002; // Just above EMA20
    }

    // ===================================================================
    // Priority 5: Prediction-based entry
    // ===================================================================
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const avgPrediction = predictions.combined.predictions[0].average;
      const predictedChange = (avgPrediction - lastPrice) / lastPrice;
      
      if (predictedChange > 0.01) {
        // Prediction is bullish, buy at slight discount
        return Math.min(lastPrice * 0.995, avgPrediction * 0.998);
      }
    }

    // ===================================================================
    // Priority 6: RSI oversold bounce
    // ===================================================================
    if (lastBar.rsi && lastBar.rsi < 30) {
      return lastPrice * 0.995; // Buy on oversold bounce
    }

    // ===================================================================
    // Priority 7: Bollinger Band squeeze
    // ===================================================================
    if (lastBar.bbWidth && lastBar.bbWidth < 0.05) {
      // Squeeze breakout - buy on expansion
      return lastPrice * 1.001;
    }

    // ===================================================================
    // Fallback: ATR-based entry
    // ===================================================================
    if (atr > 0) {
      return lastPrice - (atr * 0.5); // Half ATR below current
    }

    // Ultimate fallback
    return lastPrice * 0.99;
  }

  /**
   * Calculate sell target using enhanced strategy
   * Priority: 1) Pattern completion, 2) Resistance with volume, 3) Prediction, 4) Fibonacci, 5) ATR-based
   */
  _calculateSellTarget(data, predictions, patternAnalysis) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastBar = data[data.length - 1];
    const lastPrice = lastBar.close;
    const avgVolume = this._getAverageVolume(data);
    const atr = this._getCurrentATR(data);

    // ===================================================================
    // Priority 1: Pattern-based exits (pattern completion)
    // ===================================================================
    if (patternAnalysis && patternAnalysis.candlePatterns) {
      const bullishPatterns = patternAnalysis.candlePatterns.bullish || [];
      const bearishPatterns = patternAnalysis.candlePatterns.bearish || [];
      
      // Check for bearish reversal patterns (time to exit longs)
      for (const pattern of bearishPatterns) {
        if (pattern.confirmed && pattern.targetPrice) {
          return pattern.targetPrice * 0.998; // Slightly below target
        }
        
        switch (pattern.name) {
          case 'shooting_star':
            return lastBar.low * 0.998; // Exit at low of shooting star
            
          case 'bearish_engulfing':
            return lastBar.low * 0.998; // Exit at low of engulfing
            
          case 'evening_star':
            return data[data.length - 2].low * 0.998; // Exit at middle candle low
            
          case 'three_black_crows':
            return Math.min(
              data[data.length - 1].low,
              data[data.length - 2].low,
              data[data.length - 3].low
            ) * 0.998;
        }
      }
      
      // Check for bullish pattern completion targets
      for (const pattern of bullishPatterns) {
        if (pattern.targetPrice) {
          return pattern.targetPrice * 0.998; // Slightly below target
        }
        
        // Measured move for patterns with defined targets
        switch (pattern.name) {
          case 'hammer':
            // Target: hammer height from low
            return lastBar.low + (lastBar.high - lastBar.low) * 0.618; // 61.8% Fib extension
            
          case 'bullish_engulfing':
            // Target: engulfing range
            return lastBar.high + (lastBar.high - lastBar.low);
            
          case 'piercing_line':
            // Target: 50% of piercing range
            if (data.length >= 2) {
              const prevBar = data[data.length - 2];
              return lastBar.close + (prevBar.close - prevBar.open) * 0.5;
            }
            break;
            
          case 'morning_star':
            // Target: measured move from first candle
            if (data.length >= 3) {
              const firstCandle = data[data.length - 3];
              return firstCandle.close + (firstCandle.open - firstCandle.low);
            }
            break;
        }
      }
    }

    // ===================================================================
    // Priority 2: Resistance zone with volume confirmation
    // ===================================================================
    if (lastBar.resistance) {
      const volumeMultiplier = lastBar.volume / (avgVolume || 1);
      
      // Strong resistance with high volume
      if (volumeMultiplier > 1.5 && lastPrice >= lastBar.resistance * 0.99) {
        return lastBar.resistance * 0.998; // Slightly below resistance with volume
      }
      
      // Regular resistance
      if (lastPrice >= lastBar.resistance * 0.98) {
        return lastBar.resistance * 0.998; // Slightly below resistance
      }
      
      return lastBar.resistance * 1.002; // Just above resistance for breakout
    }

    // ===================================================================
    // Priority 3: Fibonacci extension levels
    // ===================================================================
    const fibLevels = this._calculateFibonacciLevels(data);
    if (fibLevels) {
      // Use 161.8% extension as primary target
      if (fibLevels.extension161) {
        return fibLevels.extension161;
      }
      // Fallback to 127.2% extension
      if (fibLevels.extension127) {
        return fibLevels.extension127;
      }
      // Fallback to 100% extension
      if (fibLevels.extension100) {
        return fibLevels.extension100;
      }
    }

    // ===================================================================
    // Priority 4: Prediction-based exit
    // ===================================================================
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const avgPrediction = predictions.combined.predictions[0].average;
      const predictedChange = (avgPrediction - lastPrice) / lastPrice;
      
      if (predictedChange > 0.01) {
        // Prediction is bullish, sell at slight premium to prediction
        return avgPrediction * 1.005;
      }
    }

    // ===================================================================
    // Priority 5: RSI overbought
    // ===================================================================
    if (lastBar.rsi && lastBar.rsi > 70) {
      return lastPrice * 1.005; // Sell on overbought
    }

    // ===================================================================
    // Priority 6: Bollinger Band upper touch
    // ===================================================================
    if (lastBar.upperBand && lastPrice >= lastBar.upperBand * 0.995) {
      return lastBar.upperBand * 0.998; // Sell at upper band
    }

    // ===================================================================
    // Priority 7: ATR-based profit target
    // ===================================================================
    if (atr > 0) {
      const buyTarget = this._calculateBuyTarget(data, predictions, patternAnalysis);
      if (buyTarget) {
        // 2x ATR profit target
        return buyTarget + (atr * 2);
      }
      return lastPrice + (atr * 2);
    }

    // Ultimate fallback
    return lastPrice * 1.015;
  }

  /**
   * Get average volume from data
   */
  _getAverageVolume(data) {
    if (!data || data.length === 0) return 0;
    const volumes = data.map(b => b.volume).filter(v => v !== null && v !== undefined);
    if (volumes.length === 0) return 0;
    return volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  }

  /**
   * Get current ATR value
   */
  _getCurrentATR(data) {
    if (!data || data.length === 0) return 0;
    const atrValues = data.map(b => b.atr).filter(v => v !== null && v !== undefined);
    if (atrValues.length === 0) return 0;
    return atrValues[atrValues.length - 1];
  }

  /**
   * Calculate Fibonacci extension levels
   */
  _calculateFibonacciLevels(data) {
    if (!data || data.length < 2) return null;
    
    const lastBar = data[data.length - 1];
    const swingLow = this._findSwingLow(data, 10);
    const swingHigh = this._findSwingHigh(data, 10);
    
    if (!swingLow || !swingHigh) return null;
    
    const leg = swingHigh.close - swingLow.close;
    const extensionBase = swingLow.close;
    
    return {
      extension61: extensionBase + (leg * 0.618),
      extension100: extensionBase + leg,
      extension127: extensionBase + (leg * 1.272),
      extension161: extensionBase + (leg * 1.618),
      extension200: extensionBase + (leg * 2.0),
      retracement23: extensionBase + (leg * 0.236),
      retracement38: extensionBase + (leg * 0.382),
      retracement50: extensionBase + (leg * 0.5),
      retracement61: extensionBase + (leg * 0.618),
      retracement78: extensionBase + (leg * 0.786)
    };
  }

  /**
   * Find recent swing low
   */
  _findSwingLow(data, lookback) {
    if (!data || data.length < lookback) return null;
    
    const recent = data.slice(-lookback);
    let swingLow = recent[0];
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].low < swingLow.low) {
        swingLow = recent[i];
      }
    }
    
    return swingLow;
  }

  /**
   * Find recent swing high
   */
  _findSwingHigh(data, lookback) {
    if (!data || data.length < lookback) return null;
    
    const recent = data.slice(-lookback);
    let swingHigh = recent[0];
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].high > swingHigh.high) {
        swingHigh = recent[i];
      }
    }
    
    return swingHigh;
  }

  /**
   * Calculate risk metrics with enhanced strategy
   */
  _calculateRiskMetrics(data, buyTarget, sellTarget, patternAnalysis = null) {
    if (!data || data.length === 0 || buyTarget === null || sellTarget === null) {
      return {
        stopLoss: null,
        takeProfit: null,
        riskRewardRatio: null,
        positionSize: null,
        maxLoss: null
      };
    }

    const lastBar = data[data.length - 1];
    const lastPrice = lastBar.close;
    const atr = this._getCurrentATR(data);
    const avgVolume = this._getAverageVolume(data);

    // ===================================================================
    // Stop Loss Calculation (Multiple Strategies)
    // ===================================================================
    let stopLoss = null;
    const stopLossMethods = [];

    // Method 1: ATR-based (1.5x ATR below entry)
    if (atr > 0) {
      const atrStop = buyTarget - (atr * 1.5);
      stopLossMethods.push({ value: atrStop, method: 'ATR 1.5x', weight: 0.4 });
    }

    // Method 2: Support-based (below recent swing low)
    const swingLow = this._findSwingLow(data, 20);
    if (swingLow && swingLow.low < buyTarget) {
      const supportStop = swingLow.low * 0.995;
      stopLossMethods.push({ value: supportStop, method: 'Swing Low', weight: 0.3 });
    }

    // Method 3: Pattern-based (pattern invalidation point)
    if (patternAnalysis && patternAnalysis.candlePatterns) {
      for (const pattern of patternAnalysis.candlePatterns.bullish || []) {
        if (pattern.invalidationPoint) {
          stopLossMethods.push({ value: pattern.invalidationPoint, method: 'Pattern Invalidation', weight: 0.3 });
        }
      }
    }

    // Method 4: Percentage-based (2% below entry)
    stopLossMethods.push({ value: buyTarget * 0.98, method: '2% Rule', weight: 0.2 });

    // Method 5: Moving average based (below EMA20)
    if (lastBar.ema20 && lastBar.ema20 < buyTarget) {
      stopLossMethods.push({ value: lastBar.ema20 * 0.995, method: 'EMA20', weight: 0.2 });
    }

    // Weighted average of all stop loss methods
    if (stopLossMethods.length > 0) {
      const totalWeight = stopLossMethods.reduce((sum, m) => sum + m.weight, 0);
      stopLoss = stopLossMethods.reduce((sum, m) => sum + (m.value * m.weight), 0) / totalWeight;
    } else {
      // Ultimate fallback
      stopLoss = buyTarget * 0.98;
    }

    // Ensure stop loss is below buy target
    if (stopLoss >= buyTarget) {
      stopLoss = buyTarget * 0.98;
    }

    // ===================================================================
    // Take Profit Calculation
    // ===================================================================
    let takeProfit = sellTarget;
    
    // Consider trailing stop based on ATR
    const trailingStopDistance = atr * 2.5; // 2.5x ATR trailing
    
    // ===================================================================
    // Risk/Reward Ratio
    // ===================================================================
    const risk = buyTarget - stopLoss;
    const reward = takeProfit - buyTarget;
    const riskRewardRatio = risk > 0 ? reward / risk : null;

    // ===================================================================
    // Position Sizing (based on risk and volatility)
    // ===================================================================
    let positionSize = null;
    let maxLoss = null;
    
    // Calculate position size for different account sizes
    // Risk per trade: 1-2% of account
    const accountSizes = [1000, 5000, 10000, 50000, 100000];
    const positionSizesByAccount = {};
    
    for (const accountSize of accountSizes) {
      const riskAmount = accountSize * 0.015; // 1.5% risk per trade
      const shares = riskAmount / Math.max(risk, 0.01);
      positionSizesByAccount[`$${accountSize}`] = {
        shares: Math.round(shares * 100) / 100, // Round to 2 decimals for fractional
        dollarAmount: Math.round(shares * buyTarget * 100) / 100,
        riskPercent: 1.5
      };
    }

    return {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      riskRewardRatio: riskRewardRatio,
      riskAmount: risk,
      rewardAmount: reward,
      positionSizes: positionSizesByAccount,
      atr: atr,
      trailingStopDistance: trailingStopDistance,
      stopLossMethod: stopLossMethods.length > 0 ? 
        stopLossMethods.reduce((a, b) => a.weight > b.weight ? a : b).method : 'fallback'
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
    const riskAmount = riskMetrics.riskAmount || 0;
    const rewardAmount = riskMetrics.rewardAmount || 0;
    const stopLossMethod = riskMetrics.stopLossMethod || 'unknown';

    let interpretation = '';

    // Risk/Reward ratio assessment
    if (ratio > 3) {
      interpretation += `EXCELLENT risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    } else if (ratio > 2) {
      interpretation += `Excellent risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    } else if (ratio > 1.5) {
      interpretation += `Good risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    } else if (ratio > 1) {
      interpretation += `Acceptable risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    } else if (ratio > 0.5) {
      interpretation += `Marginal risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    } else {
      interpretation += `POOR risk/reward ratio of ${ratio.toFixed(2)}:1. `;
    }

    // Stop loss details
    interpretation += `Stop loss at ${(riskMetrics.stopLoss || 0).toFixed(2)} `;
    interpretation += `(using ${stopLossMethod} method, ${riskAmount.toFixed(2)} risk). `;

    // Take profit details
    interpretation += `Take profit at ${(riskMetrics.takeProfit || 0).toFixed(2)} `;
    interpretation += `(${rewardAmount.toFixed(2)} potential reward).`;

    // Position sizing info
    if (riskMetrics.positionSizes) {
      const sizes = Object.entries(riskMetrics.positionSizes);
      if (sizes.length > 0) {
        const [accountSize, sizeInfo] = sizes[Math.min(sizes.length - 1, 2)]; // Use middle account size
        interpretation += ` Suggested position: ${sizeInfo.shares} shares (${sizeInfo.dollarAmount}) for ${accountSize} account.`;
      }
    }

    // Risk management advice
    if (ratio > 2) {
      interpretation += ' Favorable trade setup - consider full position size.';
    } else if (ratio > 1) {
      interpretation += ' Acceptable trade setup - consider standard position size.';
    } else {
      interpretation += ' High risk trade - consider reducing position size or waiting for better setup.';
    }

    return interpretation;
  }

  /**
   * Get overall recommendation summary with enhanced strategy
   */
  _getOverallRecommendationSummary(recommendations, data) {
    const { signal, confidence, strength } = recommendations.overall;
    const lastPrice = data[data.length - 1].close;
    const lastBar = data[data.length - 1];
    const buyTarget = recommendations.priceTargets.buy;
    const sellTarget = recommendations.priceTargets.sell;
    const riskMetrics = recommendations.riskMetrics;

    let summary = `Overall ${signal.toUpperCase()} signal with ${confidence}% confidence (strength: ${(strength * 100).toFixed(0)}%).`;

    // ===================================================================
    // Technical Context
    // ===================================================================
    const technicalSignals = [];
    
    if (lastBar.rsi !== undefined) {
      if (lastBar.rsi > 70) {
        technicalSignals.push(`RSI overbought (${lastBar.rsi.toFixed(1)})`);
      } else if (lastBar.rsi < 30) {
        technicalSignals.push(`RSI oversold (${lastBar.rsi.toFixed(1)})`);
      } else if (lastBar.rsi > 50) {
        technicalSignals.push(`RSI bullish (${lastBar.rsi.toFixed(1)})`);
      } else {
        technicalSignals.push(`RSI neutral (${lastBar.rsi.toFixed(1)})`);
      }
    }

    if (lastBar.macd !== undefined && lastBar.signal !== undefined) {
      if (lastBar.macd > lastBar.signal) {
        technicalSignals.push('MACD bullish crossover');
      } else if (lastBar.macd < lastBar.signal) {
        technicalSignals.push('MACD bearish crossover');
      }
    }

    if (lastBar.close && lastBar.upperBand && lastBar.lowerBand) {
      const bbPosition = (lastBar.close - lastBar.lowerBand) / (lastBar.upperBand - lastBar.lowerBand);
      if (bbPosition > 1) {
        technicalSignals.push('Price above upper Bollinger Band');
      } else if (bbPosition < 0) {
        technicalSignals.push('Price below lower Bollinger Band');
      } else if (bbPosition > 0.8) {
        technicalSignals.push('Price near upper Bollinger Band');
      } else if (bbPosition < 0.2) {
        technicalSignals.push('Price near lower Bollinger Band');
      }
    }

    if (technicalSignals.length > 0) {
      summary += ` Technical: ${technicalSignals.join(', ')}.`;
    }

    // ===================================================================
    // Trend Context
    // ===================================================================
    if (recommendations.breakdown.technical) {
      const trendAnalysis = this._calculateTrendAnalysis(data);
      if (trendAnalysis) {
        const { shortTerm, mediumTerm, longTerm, overall } = trendAnalysis;
        const bullishCount = [shortTerm, mediumTerm, longTerm].filter(t => t === 'bullish').length;
        const bearishCount = [shortTerm, mediumTerm, longTerm].filter(t => t === 'bearish').length;
        
        if (overall !== 'neutral') {
          summary += ` Trend: ${overall.toUpperCase()} (${bullishCount} bullish, ${bearishCount} bearish timeframes).`;
        }
      }
    }

    // ===================================================================
    // Volume Context
    // ===================================================================
    if (lastBar.volume) {
      const avgVolume = this._getAverageVolume(data);
      const volumeRatio = lastBar.volume / (avgVolume || 1);
      if (volumeRatio > 2) {
        summary += ` VOLUME SPIKE: ${volumeRatio.toFixed(1)}x average - strong conviction.`;
      } else if (volumeRatio > 1.5) {
        summary += ` High volume (${volumeRatio.toFixed(1)}x average) confirms price action.`;
      } else if (volumeRatio < 0.5) {
        summary += ` Low volume (${volumeRatio.toFixed(1)}x average) - weak conviction.`;
      } else if (volumeRatio < 1) {
        summary += ` Below average volume (${volumeRatio.toFixed(1)}x).`;
      }
    }

    // ===================================================================
    // Pattern Context
    // ===================================================================
    if (recommendations.breakdown.patterns.signal !== 'neutral') {
      const patternCount = (recommendations.breakdown.patterns.signal === 'bullish' ? 
        (data.patternAnalysis?.statistics?.candle?.bullish || 0) + (data.patternAnalysis?.statistics?.chart?.bullish || 0) :
        (data.patternAnalysis?.statistics?.candle?.bearish || 0) + (data.patternAnalysis?.statistics?.chart?.bearish || 0));
      summary += ` Pattern: ${recommendations.breakdown.patterns.signal.toUpperCase()} (${patternCount} patterns detected).`;
    }

    // ===================================================================
    // Prediction Context
    // ===================================================================
    if (recommendations.breakdown.predictions.signal !== 'neutral') {
      const predSignal = recommendations.breakdown.predictions.signal;
      summary += ` Prediction: ${predSignal.toUpperCase()} bias.`;
    }

    // ===================================================================
    // Price Target Context
    // ===================================================================
    if (buyTarget && sellTarget) {
      const entryDiff = ((buyTarget - lastPrice) / lastPrice) * 100;
      const targetDiff = ((sellTarget - lastPrice) / lastPrice) * 100;
      const entryText = entryDiff > 0 ? `+${entryDiff.toFixed(2)}%` : `${entryDiff.toFixed(2)}%`;
      const targetText = targetDiff > 0 ? `+${targetDiff.toFixed(2)}%` : `${targetDiff.toFixed(2)}%`;
      
      summary += ` Entry: $${buyTarget.toFixed(2)} (${entryText}), Target: $${sellTarget.toFixed(2)} (${targetText}).`;
    }

    // ===================================================================
    // Risk/Reward Assessment
    // ===================================================================
    if (riskMetrics && riskMetrics.riskRewardRatio) {
      const ratio = riskMetrics.riskRewardRatio;
      if (ratio >= 2) {
        summary += ` EXCELLENT risk/reward (${ratio.toFixed(2)}:1).`;
      } else if (ratio >= 1.5) {
        summary += ` Good risk/reward (${ratio.toFixed(2)}:1).`;
      } else if (ratio >= 1) {
        summary += ` Acceptable risk/reward (${ratio.toFixed(2)}:1).`;
      } else {
        summary += ` POOR risk/reward (${ratio.toFixed(2)}:1) - consider waiting.`;
      }
    }

    // ===================================================================
    // Action Recommendation
    // ===================================================================
    if (signal === 'bullish') {
      if (recommendations.breakdown.technical.signal === 'bullish' && 
          recommendations.breakdown.patterns.signal === 'bullish' &&
          recommendations.breakdown.predictions.signal === 'bullish') {
        summary += ` STRONG BUY: All analysis components aligned bullish. Aggressive entry recommended.`;
      } else {
        summary += ` BUY: Multiple components support bullish thesis. Consider buying on dips or breakouts.`;
      }
    } else if (signal === 'bearish') {
      if (recommendations.breakdown.technical.signal === 'bearish' && 
          recommendations.breakdown.patterns.signal === 'bearish' &&
          recommendations.breakdown.predictions.signal === 'bearish') {
        summary += ` STRONG SELL: All analysis components aligned bearish. Aggressive exit recommended.`;
      } else {
        summary += ` SELL: Multiple components support bearish thesis. Consider selling on rallies or breakdowns.`;
      }
    } else {
      if (strength > 0.3) {
        summary += ` HOLD: Mixed signals but leaning slightly ${recommendations.breakdown.technical.signal}. Wait for confirmation.`;
      } else {
        summary += ` NEUTRAL: No clear direction. Consider waiting for stronger signals before taking action.`;
      }
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
