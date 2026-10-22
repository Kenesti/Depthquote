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
      // If period is an array, use it directly as the data
      let historicalData;
      if (Array.isArray(period)) {
        historicalData = period;
      } else {
        historicalData = await dataScraper.fetchHistoricalData(symbol, {
          period,
          interval
        });
      }

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

      // Step 6: Extract pattern analysis
      let patternAnalysis = null;
      if (includePatterns) {
        patternAnalysis = this._extractPatternAnalysis(dataWithPatterns);
      }

      // Step 7: Generate recommendations
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
  _generateRecommendations(data, predictions, symbol, patternAnalysis = null) {
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

    // Extract pattern analysis if not provided
    if (!patternAnalysis) {
      patternAnalysis = this._extractPatternAnalysis(data);
    }

    // Technical analysis signal
    const technicalSignals = this._calculateTechnicalSignals(data);
    const buyCount = technicalSignals.buy.length;
    const sellCount = technicalSignals.sell.length;
    
    // Use simple majority for technical (it has the most indicators)
    if (buyCount > sellCount) {
      recommendations.breakdown.technical.signal = 'bullish';
    } else if (sellCount > buyCount) {
      recommendations.breakdown.technical.signal = 'bearish';
    } else {
      recommendations.breakdown.technical.signal = 'neutral';
    }

    // Pattern analysis signal
    if (patternAnalysis) {
      const bullishPatterns = patternAnalysis.statistics.candle.bullish + patternAnalysis.statistics.chart.bullish;
      const bearishPatterns = patternAnalysis.statistics.candle.bearish + patternAnalysis.statistics.chart.bearish;
      
      // Simple majority for patterns
      if (bullishPatterns > bearishPatterns) {
        recommendations.breakdown.patterns.signal = 'bullish';
      } else if (bearishPatterns > bullishPatterns) {
        recommendations.breakdown.patterns.signal = 'bearish';
      }
      // Otherwise neutral
    }

    // Prediction signal - use combined prediction direction as primary signal
    // The combined prediction already does weighted averaging, so we trust it
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const lastPrice = data[data.length - 1].close;
      const avgPrediction = predictions.combined.predictions[0].average || lastPrice;
      const change = (avgPrediction - lastPrice) / lastPrice;
      
      // Use the combined prediction direction
      // Require at least 0.5% move to be considered directional (more sensitive)
      if (change > 0.005) {
        recommendations.breakdown.predictions.signal = 'bullish';
      } else if (change < -0.005) {
        recommendations.breakdown.predictions.signal = 'bearish';
      }
      // Otherwise remains neutral (not enough predicted movement)
    }

    // Volume signal - use both OBV and volume trend
    const volumeAnalysis = this._calculateVolumeAnalysis(data);
    let volumeSignal = 'neutral';
    
    // OBV trend
    if (volumeAnalysis.obv === 'bullish') {
      volumeSignal = 'bullish';
    } else if (volumeAnalysis.obv === 'bearish') {
      volumeSignal = 'bearish';
    }
    
    // Volume confirmation: check if recent volume supports the price trend
    if (volumeAnalysis.volumeTrend) {
      const lastBar = data[data.length - 1];
      const prevBar = data[data.length - 2];
      const prevPrevBar = data[data.length - 3];
      
      if (prevBar && prevPrevBar) {
        const avgVolume = this._getAverageVolume(data);
        const recentVolume = (lastBar.volume + prevBar.volume + prevPrevBar.volume) / 3;
        
        // Volume increasing with price = confirmation
        if (recentVolume > avgVolume * 1.2) {
          // If price is rising with high volume, confirm bullish
          if (lastBar.close > prevBar.close && volumeSignal === 'bullish') {
            volumeSignal = 'bullish';
          }
          // If price is falling with high volume, confirm bearish
          else if (lastBar.close < prevBar.close && volumeSignal === 'bearish') {
            volumeSignal = 'bearish';
          }
        }
      }
    }
    
    recommendations.breakdown.volume.signal = volumeSignal;

    // Calculate overall signal with weights
    const signals = recommendations.breakdown;
    let weightedSum = 0;
    let totalWeight = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    for (const [key, value] of Object.entries(signals)) {
      const signalValue = this._signalToValue(value.signal);
      weightedSum += signalValue * value.weight;
      totalWeight += value.weight;
      
      if (value.signal === 'bullish') bullishCount++;
      else if (value.signal === 'bearish') bearishCount++;
      else neutralCount++;
    }

    const overallSignalValue = weightedSum / totalWeight;
    let signal = this._valueToSignal(overallSignalValue);
    
    // NEW: Only generate recommendations for HIGH-PROBABILITY trades
    // Strategy: Require ALL 3 main components (technical, patterns, predictions) to agree
    // This ensures we only suggest trades with strong multi-method confirmation
    const mainComponents = ['technical', 'patterns', 'predictions'];
    const mainBullish = mainComponents.filter(k => signals[k].signal === 'bullish').length;
    const mainBearish = mainComponents.filter(k => signals[k].signal === 'bearish').length;
    
    // Require ALL 3 main components to agree for a trade signal
    // This is strict: only trade when technical, patterns, AND predictions all agree
    if (mainBullish === 3) {
      signal = 'bullish';
      recommendations.overall.confidence = 100; // All 3 agree - highest confidence
    } else if (mainBearish === 3) {
      signal = 'bearish';
      recommendations.overall.confidence = 100; // All 3 agree - highest confidence
    } else {
      // Not enough agreement among main components
      // We could use 2 out of 3, but that's what was causing marginal signals
      // With 3 out of 3 required, we only trade the strongest setups
      signal = 'neutral';
      recommendations.overall.confidence = 0;
    }
    
    recommendations.overall.signal = signal;
    recommendations.overall.strength = Math.abs(overallSignalValue);

    // Calculate price targets using enhanced strategy
    const lastPrice = data[data.length - 1].close;
    const buyTarget = this._calculateBuyTarget(data, predictions, patternAnalysis, signal);
    recommendations.priceTargets.buy = buyTarget;
    recommendations.priceTargets.sell = this._calculateSellTarget(data, predictions, patternAnalysis, buyTarget, signal);
    recommendations.priceTargets.interpretation = this._getPriceTargetInterpretation(
      lastPrice,
      recommendations.priceTargets.buy,
      recommendations.priceTargets.sell
    );

    // Calculate risk metrics using enhanced strategy
    recommendations.riskMetrics = this._calculateRiskMetrics(
      data,
      buyTarget,
      recommendations.priceTargets.sell,
      patternAnalysis,
      signal
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
   * Using stricter thresholds to require stronger conviction
   */
  _valueToSignal(value) {
    if (value > 0.35) return 'bullish';
    if (value < -0.35) return 'bearish';
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
  _calculateBuyTarget(data, predictions, patternAnalysis, signal = null) {
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
   * This always returns a take-profit target ABOVE the buy target
   * Uses multiple methods and returns the best one
   */
  _calculateSellTarget(data, predictions, patternAnalysis, buyTargetParam = null, signal = null) {
    if (!data || data.length === 0) {
      return null;
    }

    const lastBar = data[data.length - 1];
    const lastPrice = lastBar.close;
    const buyTarget = buyTargetParam || this._calculateBuyTarget(data, predictions, patternAnalysis, signal);
    const avgVolume = this._getAverageVolume(data);
    const atr = this._getCurrentATR(data);
    
    // Collect all potential sell targets
    const potentialTargets = [];

    // ===================================================================
    // Method 1: Pattern-based exits
    // ===================================================================
    if (patternAnalysis && patternAnalysis.candlePatterns) {
      const bullishPatterns = patternAnalysis.candlePatterns.bullish || [];
      const bearishPatterns = patternAnalysis.candlePatterns.bearish || [];
      
      // Bullish pattern completion targets
      for (const pattern of bullishPatterns) {
        if (pattern.targetPrice) {
          potentialTargets.push({ value: pattern.targetPrice, weight: 0.4, method: `Pattern: ${pattern.name}` });
        }
        
        // Measured move targets
        switch (pattern.name) {
          case 'hammer':
          case 'inverted_hammer':
            potentialTargets.push({ 
              value: lastBar.low + (lastBar.high - lastBar.low) * 0.618, 
              weight: 0.35, 
              method: 'Hammer Fib Extension' 
            });
            break;
            
          case 'bullish_engulfing':
            potentialTargets.push({ 
              value: lastBar.high + (lastBar.high - lastBar.low), 
              weight: 0.35, 
              method: 'Bullish Engulfing Target' 
            });
            break;
            
          case 'piercing_line':
            if (data.length >= 2) {
              const prevBar = data[data.length - 2];
              potentialTargets.push({ 
                value: lastBar.close + (prevBar.close - prevBar.open) * 0.5, 
                weight: 0.35, 
                method: 'Piercing Line Target' 
              });
            }
            break;
            
          case 'morning_star':
            if (data.length >= 3) {
              const firstCandle = data[data.length - 3];
              potentialTargets.push({ 
                value: firstCandle.close + (firstCandle.open - firstCandle.low), 
                weight: 0.35, 
                method: 'Morning Star Target' 
              });
            }
            break;
            
          case 'three_white_soldiers':
            if (data.length >= 3) {
              potentialTargets.push({ 
                value: Math.max(
                  data[data.length - 1].high,
                  data[data.length - 2].high,
                  data[data.length - 3].high
                ) * 1.005, 
                weight: 0.35, 
                method: 'Three White Soldiers Target' 
              });
            }
            break;
        }
      }
      
      // Bearish reversal patterns (exit signals)
      for (const pattern of bearishPatterns) {
        if (pattern.targetPrice) {
          potentialTargets.push({ value: pattern.targetPrice, weight: 0.25, method: `Bearish Pattern: ${pattern.name}` });
        }
      }
    }

    // ===================================================================
    // Method 2: Resistance zone
    // ===================================================================
    if (lastBar.resistance) {
      const volumeMultiplier = lastBar.volume / (avgVolume || 1);
      
      if (volumeMultiplier > 1.5 && lastPrice >= lastBar.resistance * 0.99) {
        potentialTargets.push({ value: lastBar.resistance * 0.998, weight: 0.35, method: 'Resistance with Volume' });
      } else if (lastPrice >= lastBar.resistance * 0.98) {
        potentialTargets.push({ value: lastBar.resistance * 0.998, weight: 0.3, method: 'Resistance' });
      } else {
        potentialTargets.push({ value: lastBar.resistance * 1.002, weight: 0.25, method: 'Resistance Breakout' });
      }
    }

    // ===================================================================
    // Method 3: Fibonacci extension levels
    // ===================================================================
    const fibLevels = this._calculateFibonacciLevels(data);
    if (fibLevels) {
      if (fibLevels.extension161) {
        potentialTargets.push({ value: fibLevels.extension161, weight: 0.4, method: 'Fib 161.8% Extension' });
      }
      if (fibLevels.extension127) {
        potentialTargets.push({ value: fibLevels.extension127, weight: 0.35, method: 'Fib 127.2% Extension' });
      }
      if (fibLevels.extension100) {
        potentialTargets.push({ value: fibLevels.extension100, weight: 0.3, method: 'Fib 100% Extension' });
      }
    }

    // ===================================================================
    // Method 4: Prediction-based
    // ===================================================================
    if (predictions && predictions.combined && predictions.combined.predictions[0]) {
      const avgPrediction = predictions.combined.predictions[0].average;
      const predictedChange = (avgPrediction - lastPrice) / lastPrice;
      
      if (predictedChange > 0.01) {
        potentialTargets.push({ value: avgPrediction * 1.005, weight: 0.35, method: 'Prediction' });
      }
    }

    // ===================================================================
    // Method 5: RSI overbought
    // ===================================================================
    if (lastBar.rsi && lastBar.rsi > 70) {
      potentialTargets.push({ value: lastPrice * 1.005, weight: 0.25, method: 'RSI Overbought' });
    }

    // ===================================================================
    // Method 6: Bollinger Band upper
    // ===================================================================
    if (lastBar.upperBand && lastPrice >= lastBar.upperBand * 0.995) {
      potentialTargets.push({ value: lastBar.upperBand * 0.998, weight: 0.3, method: 'Bollinger Upper Band' });
    }

    // ===================================================================
    // Method 7: ATR-based
    // ===================================================================
    if (atr > 0 && buyTarget) {
      potentialTargets.push({ value: buyTarget + (atr * 2), weight: 0.3, method: 'ATR 2x Target' });
      potentialTargets.push({ value: buyTarget + (atr * 3), weight: 0.25, method: 'ATR 3x Target' });
    }

    // ===================================================================
    // Method 8: Moving average based
    // ===================================================================
    if (lastBar.sma20 && lastBar.sma50) {
      const maGap = lastBar.sma50 - lastBar.sma20;
      if (maGap > 0) {
        potentialTargets.push({ value: lastBar.sma20 + maGap, weight: 0.25, method: 'MA Gap Target' });
      }
    }

    // ===================================================================
    // Filter and select best target
    // ===================================================================
    if (potentialTargets.length > 0) {
      // Filter out targets below buy target (for long positions)
      const validTargets = potentialTargets.filter(t => t.value > (buyTarget || 0));
      
      if (validTargets.length > 0) {
        // Sort by weight (descending) and pick the highest weighted
        validTargets.sort((a, b) => b.weight - a.weight);
        return validTargets[0].value;
      }
    }

    // ===================================================================
    // Fallback: Ensure sell is above buy
    // ===================================================================
    if (buyTarget && buyTarget > 0) {
      const minSell = buyTarget * 1.01; // Minimum 1% above buy
      const atrSell = atr > 0 ? buyTarget + (atr * 2) : lastPrice * 1.015;
      return Math.max(atrSell, minSell);
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
  _calculateRiskMetrics(data, buyTarget, sellTarget, patternAnalysis = null, signal = null) {
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
      return `ADX at ${(adx || 0).toFixed(1)} indicates a strong trend. Direction is ${direction} with +DI at ${(plusDi || 0).toFixed(1)} and -DI at ${(minusDi || 0).toFixed(1)}.`;
    } else {
      return `ADX at ${(adx || 0).toFixed(1)} indicates a very strong trend. The market is in a powerful ${plusDi > minusDi ? 'uptrend' : 'downtrend'}.`;
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
      return `Stochastic is in oversold territory (K=${(k || 0).toFixed(1)}, D=${(d || 0).toFixed(1)}). A bullish crossover here would signal a strong buy.`;
    } else if (k > 80 && d > 80) {
      return `Stochastic is in overbought territory (K=${(k || 0).toFixed(1)}, D=${(d || 0).toFixed(1)}). A bearish crossover here would signal a strong sell.`;
    } else if (k > d) {
      return `Stochastic K (${(k || 0).toFixed(1)}) is above D (${(d || 0).toFixed(1)}). Bullish momentum in the short term.`;
    } else if (k < d) {
      return `Stochastic K (${(k || 0).toFixed(1)}) is below D (${(d || 0).toFixed(1)}). Bearish momentum in the short term.`;
    }
    return `Stochastic is neutral with K and D at similar levels (${(k || 0).toFixed(1)}).`;
  }

  /**
   * Get CCI interpretation
   */
  _getCCIInterpretation(cci) {
    if (cci === undefined || cci === null) {
      return null;
    }

    if (cci > 100) {
      return `CCI at ${(cci || 0).toFixed(1)} is in extreme overbought territory. Price may be due for a correction.`;
    } else if (cci > 50) {
      return `CCI at ${(cci || 0).toFixed(1)} is above the +50 line, indicating bullish momentum.`;
    } else if (cci > 0) {
      return `CCI at ${(cci || 0).toFixed(1)} is positive, indicating mild bullish momentum.`;
    } else if (cci > -50) {
      return `CCI at ${(cci || 0).toFixed(1)} is negative but above -50, indicating mild bearish momentum.`;
    } else if (cci > -100) {
      return `CCI at ${(cci || 0).toFixed(1)} is below -50, indicating bearish momentum.`;
    } else {
      return `CCI at ${(cci || 0).toFixed(1)} is in extreme oversold territory. Price may be due for a bounce.`;
    }
  }

  /**
   * Get trend interpretation
   */
  _getTrendInterpretation(analysis) {
    const { shortTerm, mediumTerm, longTerm, overall } = analysis;

    if (overall === 'bullish') {
      if (shortTerm === 'bullish' && mediumTerm === 'bullish' && longTerm === 'bullish') {
        return `All timeframes are aligned bullish. This is a strong uptrend with high probability of continuation.`;
      } else if (shortTerm === 'bullish' && mediumTerm === 'bullish') {
        return `Short and medium-term trends are bullish. The uptrend is strong in the near to medium term.`;
      } else if (longTerm === 'bullish') {
        return `Long-term trend is bullish, providing a solid foundation. Short-term pullbacks are buying opportunities.`;
      }
      return `Overall trend is bullish. The market is in an uptrend.`;
    } else if (overall === 'bearish') {
      if (shortTerm === 'bearish' && mediumTerm === 'bearish' && longTerm === 'bearish') {
        return `All timeframes are aligned bearish. This is a strong downtrend with high probability of continuation.`;
      } else if (shortTerm === 'bearish' && mediumTerm === 'bearish') {
        return `Short and medium-term trends are bearish. The downtrend is strong in the near to medium term.`;
      } else if (longTerm === 'bearish') {
        return `Long-term trend is bearish. Rallies should be used as selling opportunities.`;
      }
      return `Overall trend is bearish. The market is in a downtrend.`;
    }
    return `Trend is neutral. The market is ranging or consolidating without a clear direction.`;
  }

  /**
   * Get momentum interpretation
   */
  _getMomentumInterpretation(analysis, lastBar) {
    const { rsi, stochastic, macd, cci, overall } = analysis;

    if (overall === 'bullish') {
      const signals = [];
      if (rsi === 'bullish') signals.push('RSI bullish');
      if (stochastic === 'bullish') signals.push('Stochastic bullish');
      if (macd === 'bullish') signals.push('MACD bullish');
      if (cci === 'bullish') signals.push('CCI bullish');
      
      if (signals.length >= 3) {
        return `Momentum is strongly bullish with ${signals.length}/4 indicators confirming. Price is likely to continue higher.`;
      } else if (signals.length >= 2) {
        return `Momentum is bullish with ${signals.length}/4 indicators confirming. Price has upward bias.`;
      }
      return `Momentum is slightly bullish. Price may continue higher.`;
    } else if (overall === 'bearish') {
      const signals = [];
      if (rsi === 'bearish') signals.push('RSI bearish');
      if (stochastic === 'bearish') signals.push('Stochastic bearish');
      if (macd === 'bearish') signals.push('MACD bearish');
      if (cci === 'bearish') signals.push('CCI bearish');
      
      if (signals.length >= 3) {
        return `Momentum is strongly bearish with ${signals.length}/4 indicators confirming. Price is likely to continue lower.`;
      } else if (signals.length >= 2) {
        return `Momentum is bearish with ${signals.length}/4 indicators confirming. Price has downward bias.`;
      }
      return `Momentum is slightly bearish. Price may continue lower.`;
    }
    return `Momentum is neutral. No strong directional bias in momentum indicators.`;
  }

  /**
   * Get pattern interpretation
   */
  _getPatternInterpretation(analysis) {
    const { candle, chart } = analysis.statistics;
    const totalPatterns = candle.total + chart.total;

    if (totalPatterns === 0) {
      return 'No significant patterns detected in the recent price action.';
    }

    const bullishCount = candle.bullish + chart.bullish;
    const bearishCount = candle.bearish + chart.bearish;

    if (bullishCount > bearishCount) {
      if (bullishCount >= 3) {
        return `Multiple bullish patterns detected (${bullishCount} total). Price action suggests buying pressure and potential upward continuation.`;
      }
      return `Bullish patterns are more prevalent. Price action favors the upside.`;
    } else if (bearishCount > bullishCount) {
      if (bearishCount >= 3) {
        return `Multiple bearish patterns detected (${bearishCount} total). Price action suggests selling pressure and potential downward continuation.`;
      }
      return `Bearish patterns are more prevalent. Price action favors the downside.`;
    }
    return `Mixed patterns detected. Price action is neutral without a clear directional bias.`;
  }

  /**
   * Get price target interpretation
   */
  _getPriceTargetInterpretation(lastPrice, buyTarget, sellTarget) {
    if (!buyTarget || !sellTarget) {
      return null;
    }

    const buyDiff = ((buyTarget - lastPrice) / lastPrice) * 100;
    const sellDiff = ((sellTarget - lastPrice) / lastPrice) * 100;
    const totalPotential = ((sellTarget - buyTarget) / buyTarget) * 100;

    if (buyTarget < lastPrice) {
      if (sellTarget > lastPrice) {
        return `Buy at $${buyTarget.toFixed(2)} (${buyDiff.toFixed(2)}% below current), sell at $${sellTarget.toFixed(2)} (${sellDiff.toFixed(2)}% above current). Potential profit: ${totalPotential.toFixed(2)}%.`;
      } else {
        return `Buy at $${buyTarget.toFixed(2)} (${buyDiff.toFixed(2)}% below current), sell at $${sellTarget.toFixed(2)} (${sellDiff.toFixed(2)}% below current). Wait for better entry timing.`;
      }
    } else {
      return `Buy at $${buyTarget.toFixed(2)} (${buyDiff.toFixed(2)}% above current), sell at $${sellTarget.toFixed(2)} (${sellDiff.toFixed(2)}% above current). Potential profit: ${totalPotential.toFixed(2)}%.`;
    }
  }

  /**
   * Get risk metrics interpretation
   */
  _getRiskMetricsInterpretation(metrics) {
    if (!metrics || !metrics.stopLoss || !metrics.riskRewardRatio) {
      return null;
    }

    const { stopLoss, riskRewardRatio, riskAmount, rewardAmount } = metrics;

    if (riskRewardRatio >= 2) {
      return `Excellent risk/reward ratio of ${riskRewardRatio.toFixed(2)}:1. Risking $${riskAmount.toFixed(2)} to make $${rewardAmount.toFixed(2)}. Stop loss at $${stopLoss.toFixed(2)}.`;
    } else if (riskRewardRatio >= 1.5) {
      return `Good risk/reward ratio of ${riskRewardRatio.toFixed(2)}:1. Risking $${riskAmount.toFixed(2)} to make $${rewardAmount.toFixed(2)}. Stop loss at $${stopLoss.toFixed(2)}.`;
    } else if (riskRewardRatio >= 1) {
      return `Acceptable risk/reward ratio of ${riskRewardRatio.toFixed(2)}:1. Risking $${riskAmount.toFixed(2)} to make $${rewardAmount.toFixed(2)}. Stop loss at $${stopLoss.toFixed(2)}.`;
    } else if (riskRewardRatio >= 0.5) {
      return `Low risk/reward ratio of ${riskRewardRatio.toFixed(2)}:1. Consider waiting for a better setup. Stop loss at $${stopLoss.toFixed(2)}.`;
    } else {
      return `Poor risk/reward ratio of ${riskRewardRatio.toFixed(2)}:1. This trade has unfavorable risk characteristics. Stop loss at $${stopLoss.toFixed(2)}.`;
    }
  }

  /**
   * Get overall recommendation summary
   */
  _getOverallRecommendationSummary(recommendations, data) {
    const { signal, strength, confidence } = recommendations.overall;
    const { buy, sell } = recommendations.priceTargets;
    const { stopLoss, riskRewardRatio } = recommendations.riskMetrics;
    const lastBar = data[data.length - 1];
    const lastPrice = lastBar.close;

    if (signal === 'bullish') {
      if (confidence >= 75) {
        return `Strong bullish signal (${confidence}% confidence). Technical indicators, patterns, and predictions all align bullish. Consider buying at $${buy?.toFixed(2)} with stop loss at $${stopLoss?.toFixed(2)} and take profit at $${sell?.toFixed(2)}. Risk/Reward: ${riskRewardRatio?.toFixed(2)}:1.`;
      } else if (confidence >= 60) {
        return `Moderate bullish signal (${confidence}% confidence). Most analysis components favor the upside. Consider buying at $${buy?.toFixed(2)} with stop loss at $${stopLoss?.toFixed(2)}. Risk/Reward: ${riskRewardRatio?.toFixed(2)}:1.`;
      }
      return `Bullish signal (${confidence}% confidence). Price has upside potential. Entry at $${buy?.toFixed(2)}, stop at $${stopLoss?.toFixed(2)}.`;
    } else if (signal === 'bearish') {
      if (confidence >= 75) {
        return `Strong bearish signal (${confidence}% confidence). Technical indicators, patterns, and predictions all align bearish. Consider shorting or avoiding long positions. Stop loss for longs would be at $${stopLoss?.toFixed(2)}.`;
      } else if (confidence >= 60) {
        return `Moderate bearish signal (${confidence}% confidence). Most analysis components favor the downside. Consider caution or short positions.`;
      }
      return `Bearish signal (${confidence}% confidence). Price has downside risk. Consider waiting for better entry.`;
    }
    return `Neutral signal (${confidence}% confidence). No strong directional bias. Consider waiting for clearer signals before trading.`;
  }

  // Getter methods for constants

  getSignalFromCounts(buyCount, sellCount) {
    return this._getSignalFromCounts(buyCount, sellCount);
  }

  signalToValue(signal) {
    return this._signalToValue(signal);
  }

  valueToSignal(value) {
    return this._valueToSignal(value);
  }

  calculateConfidence(signals) {
    return this._calculateConfidence(signals);
  }

  getRSISignal(rsi) {
    return this._getRSISignal(rsi);
  }

  getRSIInterpretation(rsi) {
    return this._getRSIInterpretation(rsi);
  }

  getMACDSignal(macd, signal) {
    return this._getMACDSignal(macd, signal);
  }

  getMACDInterpretation(macd, signal, histogram) {
    return this._getMACDInterpretation(macd, signal, histogram);
  }

  getBBSignal(price, bb) {
    return this._getBBSignal(price, bb);
  }

  getBBInterpretation(price, bb) {
    return this._getBBInterpretation(price, bb);
  }

  getADXSignal(adx, plusDi, minusDi) {
    return this._getADXSignal(adx, plusDi, minusDi);
  }

  getADXInterpretation(adx, plusDi, minusDi) {
    return this._getADXInterpretation(adx, plusDi, minusDi);
  }

  getStochasticSignal(k, d) {
    return this._getStochasticSignal(k, d);
  }

  getStochasticInterpretation(k, d) {
    return this._getStochasticInterpretation(k, d);
  }

  getCCIInterpretation(cci) {
    return this._getCCIInterpretation(cci);
  }

  calculateBuyTarget(data, predictions, patternAnalysis, signal) {
    return this._calculateBuyTarget(data, predictions, patternAnalysis, signal);
  }

  calculateSellTarget(data, predictions, patternAnalysis, buyTarget, signal) {
    return this._calculateSellTarget(data, predictions, patternAnalysis, buyTarget, signal);
  }

  calculateRiskMetrics(data, buyTarget, sellTarget, patternAnalysis, signal) {
    return this._calculateRiskMetrics(data, buyTarget, sellTarget, patternAnalysis, signal);
  }
}

module.exports = new AnalysisEngine();
