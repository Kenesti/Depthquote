/**
 * Small Trader Analysis Module
 * Specialized analysis for traders with limited capital ($200-$400)
 * Tests strategies specifically designed for small account sizes
 */

const analysisEngine = require('../analysis');
const dataScraper = require('../data/dataScraper');

class SmallTraderAnalysis {
  constructor() {
    this.defaultOptions = {
      minCapital: 200,
      maxCapital: 400,
      targetProfit: 500,
      maxRiskPerTrade: 0.02, // 2% risk per trade
      positionSizePercent: 25, // 25% of capital per trade for small accounts
      minShares: 1,
      fractionalTrading: true
    };
  }

  /**
   * Analyze stocks suitable for small traders
   * @param {number} capital - Starting capital
   * @param {number} targetProfit - Target profit amount
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analysis results with recommendations
   */
  async analyzeForSmallTrader(capital, targetProfit, options = {}) {
    const {
      minCapital = this.defaultOptions.minCapital,
      maxCapital = this.defaultOptions.maxCapital,
      maxRiskPerTrade = this.defaultOptions.maxRiskPerTrade,
      positionSizePercent = this.defaultOptions.positionSizePercent
    } = options;

    // Validate capital
    if (capital < minCapital || capital > maxCapital) {
      throw new Error(`Capital must be between $${minCapital} and $${maxCapital}`);
    }

    // Get list of affordable stocks (typically $10-$500 range)
    const affordableStocks = await this._getAffordableStocks(capital, positionSizePercent);

    if (affordableStocks.length === 0) {
      return {
        error: 'No affordable stocks found for the given capital',
        capital,
        targetProfit
      };
    }

    console.log(`\nAnalyzing ${affordableStocks.length} affordable stocks for $${capital} capital...`);

    // Analyze each stock
    const stockAnalyses = [];
    
    for (const symbol of affordableStocks) {
      try {
        console.log(`  Analyzing ${symbol}...`);
        
        const analysis = await analysisEngine.analyze(symbol, {
          period: '3mo',
          interval: '1d',
          includeIndicators: true,
          includePatterns: true,
          includePredictions: true,
          includeRecommendations: true
        });

        if (analysis && !analysis.error) {
          // Calculate small-trader-specific metrics
          const traderAnalysis = this._calculateTraderMetrics(
            analysis,
            capital,
            positionSizePercent,
            maxRiskPerTrade
          );

          stockAnalyses.push({
            symbol,
            analysis,
            traderMetrics: traderAnalysis
          });
        }
      } catch (error) {
        console.warn(`    Error analyzing ${symbol}:`, error.message);
      }
    }

    // Rank and filter stocks
    const rankedStocks = this._rankStocksForSmallTrader(stockAnalyses, targetProfit);

    // Generate recommendations
    const recommendations = this._generateRecommendations(
      rankedStocks,
      capital,
      targetProfit,
      positionSizePercent
    );

    return {
      capital,
      targetProfit,
      affordableStocks,
      analyzedStocks: stockAnalyses,
      rankedStocks,
      recommendations,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * Get list of affordable stocks for small traders
   * @param {number} capital - Available capital
   * @param {number} positionSizePercent - Percentage of capital to use per trade
   * @returns {Promise<string[]>} List of affordable stock symbols
   */
  async _getAffordableStocks(capital, positionSizePercent = 25) {
    // Maximum price per share we can afford
    const maxPricePerShare = (capital * (positionSizePercent / 100)) / this.defaultOptions.minShares;

    // List of typically affordable stocks (tech, finance, etc.)
    const candidateStocks = [
      // Tech stocks (some may be expensive, but we'll filter)
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC',
      'CRM', 'ADBE', 'NFLX', 'PYPL', 'SQ', 'HOOD', 'ZM', 'DOCU',
      // Finance
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW',
      // Healthcare
      'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT',
      // Consumer
      'PG', 'KO', 'PEP', 'WMT', 'DIS', 'MCD', 'NKE', 'SBUX',
      // Other affordable stocks
      'F', 'GM', 'T', 'VZ', 'XOM', 'CVX', 'BA', 'CAT', 'DE',
      // ETFs (usually affordable)
      'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO'
    ];

    // Filter to stocks that are likely affordable
    // For simplicity, we'll return a subset that are typically under $500
    const affordable = candidateStocks.filter(symbol => {
      // These are typically more affordable
      const typicallyAffordable = [
        'F', 'GM', 'T', 'VZ', 'SPY', 'QQQ', 'IWM', 'VTI', 'VOO',
        'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW',
        'PG', 'KO', 'PEP', 'WMT', 'DIS', 'MCD', 'NKE', 'SBUX',
        'AMD', 'INTC', 'CRM', 'SQ', 'HOOD', 'ZM', 'DOCU'
      ];
      return typicallyAffordable.includes(symbol);
    });

    // Add some that might be borderline but worth checking
    affordable.push('AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA');

    return affordable;
  }

  /**
   * Calculate trader-specific metrics for a stock
   * @param {object} analysis - Stock analysis
   * @param {number} capital - Available capital
   * @param {number} positionSizePercent - Percentage of capital to use
   * @param {number} maxRiskPerTrade - Maximum risk percentage
   * @returns {object} Trader-specific metrics
   */
  _calculateTraderMetrics(analysis, capital, positionSizePercent, maxRiskPerTrade) {
    const currentPrice = analysis.currentData?.regularMarketPrice || 
                         analysis.historicalData[analysis.historicalData.length - 1].close;
    
    const recommendations = analysis.recommendations;
    const buyTarget = recommendations?.priceTargets?.buy || currentPrice;
    const sellTarget = recommendations?.priceTargets?.sell || null;
    const stopLoss = recommendations?.riskMetrics?.stopLoss || null;
    const signal = recommendations?.overall?.signal || 'neutral';
    const confidence = recommendations?.overall?.confidence || 0;

    // Calculate position size
    const positionSize = (capital * (positionSizePercent / 100)) / buyTarget;
    const fractionalShares = positionSize;
    const wholeShares = Math.floor(positionSize);

    // Calculate risk metrics
    const riskPerShare = buyTarget - (stopLoss || buyTarget * 0.98);
    const totalRisk = riskPerShare * fractionalShares;
    const riskPercent = (totalRisk / capital) * 100;

    // Calculate potential reward
    const rewardPerShare = (sellTarget || buyTarget * 1.03) - buyTarget;
    const totalReward = rewardPerShare * fractionalShares;
    const rewardPercent = (totalReward / capital) * 100;

    // Risk/Reward ratio
    const riskRewardRatio = rewardPerShare / Math.max(riskPerShare, 0.01);

    // Calculate how many trades needed to reach target
    const targetProfit = 500; // Default target
    const tradesNeeded = Math.ceil(targetProfit / totalReward);

    // Calculate break-even win rate
    const winRateNeeded = this._calculateRequiredWinRate(
      riskPercent,
      rewardPercent,
      targetProfit,
      capital
    );

    return {
      currentPrice,
      buyTarget,
      sellTarget,
      stopLoss,
      signal,
      confidence,
      positionSize: fractionalShares,
      fractionalShares,
      wholeShares,
      entryCost: buyTarget * fractionalShares,
      riskPerShare,
      totalRisk,
      riskPercent: Math.round(riskPercent * 100) / 100,
      rewardPerShare,
      totalReward,
      rewardPercent: Math.round(rewardPercent * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      tradesNeeded,
      winRateNeeded: Math.round(winRateNeeded * 100) / 100,
      maxLoss: totalRisk,
      potentialGain: totalReward,
      // Small trader suitability score (0-100)
      suitabilityScore: this._calculateSuitabilityScore(
        riskRewardRatio,
        confidence,
        riskPercent,
        fractionalShares
      )
    };
  }

  /**
   * Calculate required win rate to achieve target
   */
  _calculateRequiredWinRate(riskPercent, rewardPercent, targetProfit, capital) {
    // Simplified calculation
    // If we risk X% per trade and gain Y% per winning trade,
    // what win rate do we need to achieve target?
    
    const riskPerTrade = capital * (riskPercent / 100);
    const rewardPerTrade = capital * (rewardPercent / 100);
    
    // Number of trades needed if all win
    const tradesIfAllWin = targetProfit / rewardPerTrade;
    
    // Using the formula: W * R - (1-W) * R = Target
    // Where W is win rate, R is reward per trade, r is risk per trade
    // W * reward - (1-W) * risk = targetPerTrade
    // W * (reward + risk) = targetPerTrade + risk
    // W = (targetPerTrade + risk) / (reward + risk)
    
    const targetPerTrade = targetProfit / tradesIfAllWin;
    const winRate = (targetPerTrade + riskPerTrade) / (rewardPerTrade + riskPerTrade);
    
    return Math.min(winRate, 1.0);
  }

  /**
   * Calculate suitability score for small traders
   */
  _calculateSuitabilityScore(riskRewardRatio, confidence, riskPercent, shares) {
    let score = 0;

    // Risk/Reward Ratio (up to 40 points)
    // Higher R:R is better for small traders
    if (riskRewardRatio >= 2) {
      score += 40;
    } else if (riskRewardRatio >= 1.5) {
      score += 30;
    } else if (riskRewardRatio >= 1) {
      score += 20;
    } else if (riskRewardRatio >= 0.5) {
      score += 10;
    }

    // Confidence (up to 25 points)
    score += Math.min(confidence * 0.25, 25);

    // Risk Percent (up to 20 points)
    // Lower risk is better
    if (riskPercent <= 1) {
      score += 20;
    } else if (riskPercent <= 2) {
      score += 15;
    } else if (riskPercent <= 3) {
      score += 10;
    } else if (riskPercent <= 5) {
      score += 5;
    }

    // Shares (up to 15 points)
    // More shares means better diversification
    if (shares >= 10) {
      score += 15;
    } else if (shares >= 5) {
      score += 10;
    } else if (shares >= 1) {
      score += 5;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Rank stocks for small traders
   * @param {Array} stockAnalyses - Array of stock analyses
   * @param {number} targetProfit - Target profit
   * @returns {Array} Ranked stocks
   */
  _rankStocksForSmallTrader(stockAnalyses, targetProfit) {
    return stockAnalyses
      .filter(sa => sa.traderMetrics.suitabilityScore >= 50) // Minimum score
      .sort((a, b) => {
        // Primary sort: suitability score (descending)
        if (b.traderMetrics.suitabilityScore !== a.traderMetrics.suitabilityScore) {
          return b.traderMetrics.suitabilityScore - a.traderMetrics.suitabilityScore;
        }

        // Secondary sort: risk/reward ratio (descending)
        if (b.traderMetrics.riskRewardRatio !== a.traderMetrics.riskRewardRatio) {
          return b.traderMetrics.riskRewardRatio - a.traderMetrics.riskRewardRatio;
        }

        // Tertiary sort: confidence (descending)
        return b.traderMetrics.confidence - a.traderMetrics.confidence;
      });
  }

  /**
   * Generate recommendations for small traders
   * @param {Array} rankedStocks - Ranked stocks
   * @param {number} capital - Available capital
   * @param {number} targetProfit - Target profit
   * @param {number} positionSizePercent - Position size percentage
   * @returns {object} Recommendations
   */
  _generateRecommendations(rankedStocks, capital, targetProfit, positionSizePercent) {
    const recommendations = {
      topPicks: [],
      strategy: null,
      riskAssessment: null,
      timeline: null,
      successProbability: 0
    };

    if (rankedStocks.length === 0) {
      recommendations.strategy = 'No suitable stocks found with current criteria. Consider adjusting risk tolerance or position size.';
      return recommendations;
    }

    // Take top 5 picks
    recommendations.topPicks = rankedStocks.slice(0, 5).map(sa => ({
      symbol: sa.symbol,
      currentPrice: sa.traderMetrics.currentPrice,
      buyTarget: sa.traderMetrics.buyTarget,
      sellTarget: sa.traderMetrics.sellTarget,
      stopLoss: sa.traderMetrics.stopLoss,
      signal: sa.traderMetrics.signal,
      confidence: sa.traderMetrics.confidence,
      positionSize: sa.traderMetrics.fractionalShares,
      riskPercent: sa.traderMetrics.riskPercent,
      rewardPercent: sa.traderMetrics.rewardPercent,
      riskRewardRatio: sa.traderMetrics.riskRewardRatio,
      suitabilityScore: sa.traderMetrics.suitabilityScore,
      tradesNeeded: sa.traderMetrics.tradesNeeded,
      winRateNeeded: sa.traderMetrics.winRateNeeded
    }));

    // Generate strategy
    const avgSuitability = rankedStocks.reduce((sum, sa) => sum + sa.traderMetrics.suitabilityScore, 0) / rankedStocks.length;
    const avgRiskReward = rankedStocks.reduce((sum, sa) => sum + sa.traderMetrics.riskRewardRatio, 0) / rankedStocks.length;

    if (avgSuitability >= 80) {
      recommendations.strategy = `Excellent opportunities found. With $${capital}, you can potentially achieve $${targetProfit} profit by making ${Math.round(targetProfit / (capital * 0.01))} successful trades with proper risk management.`;
    } else if (avgSuitability >= 60) {
      recommendations.strategy = `Good opportunities available. With $${capital}, focus on high-probability setups and maintain strict risk management to reach $${targetProfit}.`;
    } else {
      recommendations.strategy = `Limited opportunities with current criteria. Consider increasing position size or expanding the stock universe.`;
    }

    // Risk assessment
    const avgRiskPercent = rankedStocks.reduce((sum, sa) => sum + sa.traderMetrics.riskPercent, 0) / rankedStocks.length;
    
    if (avgRiskPercent <= 1) {
      recommendations.riskAssessment = 'Low risk per trade. Good for conservative traders.';
    } else if (avgRiskPercent <= 2) {
      recommendations.riskAssessment = 'Moderate risk per trade. Standard for most traders.';
    } else {
      recommendations.riskAssessment = 'High risk per trade. Only for aggressive traders.';
    }

    // Timeline
    const avgTradesNeeded = rankedStocks.reduce((sum, sa) => sum + sa.traderMetrics.tradesNeeded, 0) / rankedStocks.length;
    const avgWinRateNeeded = rankedStocks.reduce((sum, sa) => sum + sa.traderMetrics.winRateNeeded, 0) / rankedStocks.length;
    
    if (avgWinRateNeeded <= 60) {
      recommendations.timeline = `Realistic timeline: ${Math.round(avgTradesNeeded * 1.5)} trades over ${Math.round(avgTradesNeeded * 1.5 / 2)} weeks (assuming ~2 trades per week).`;
    } else if (avgWinRateNeeded <= 75) {
      recommendations.timeline = `Challenging but achievable: ${Math.round(avgTradesNeeded * 2)} trades over ${Math.round(avgTradesNeeded * 2 / 2)} weeks.`;
    } else {
      recommendations.timeline = `Very challenging: Requires exceptional win rate. Consider lower target or higher capital.`;
    }

    // Success probability
    recommendations.successProbability = this._calculateSuccessProbability(
      avgSuitability,
      avgRiskReward,
      avgWinRateNeeded
    );

    return recommendations;
  }

  /**
   * Calculate success probability
   */
  _calculateSuccessProbability(avgSuitability, avgRiskReward, avgWinRateNeeded) {
    let probability = 0;

    // Suitability score contribution (0-40%)
    probability += Math.min(avgSuitability * 0.4, 40);

    // Risk/Reward contribution (0-30%)
    if (avgRiskReward >= 2) {
      probability += 30;
    } else if (avgRiskReward >= 1.5) {
      probability += 20;
    } else if (avgRiskReward >= 1) {
      probability += 10;
    }

    // Win rate needed contribution (0-30%)
    if (avgWinRateNeeded <= 50) {
      probability += 30;
    } else if (avgWinRateNeeded <= 60) {
      probability += 20;
    } else if (avgWinRateNeeded <= 70) {
      probability += 10;
    }

    return Math.min(Math.round(probability), 100);
  }

  /**
   * Run a complete small trader simulation
   * @param {number} capital - Starting capital
   * @param {number} targetProfit - Target profit
   * @param {object} options - Options
   * @returns {Promise<object>} Simulation results
   */
  async runSimulation(capital, targetProfit, options = {}) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  SMALL TRADER SIMULATION: $${capital} -> $${capital + targetProfit}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const analysis = await this.analyzeForSmallTrader(capital, targetProfit, options);

    console.log('\n=== SIMULATION RESULTS ===\n');
    
    console.log(`Capital: $${capital}`);
    console.log(`Target Profit: $${targetProfit}`);
    console.log(`Target Account Value: $${capital + targetProfit}`);
    console.log(`\nTop Picks:`);
    
    if (analysis.recommendations.topPicks.length > 0) {
      analysis.recommendations.topPicks.forEach((pick, index) => {
        console.log(`\n  ${index + 1}. ${pick.symbol}`);
        console.log(`     Current Price: $${pick.currentPrice.toFixed(2)}`);
        console.log(`     Buy Target: $${pick.buyTarget.toFixed(2)}`);
        console.log(`     Sell Target: $${pick.sellTarget ? pick.sellTarget.toFixed(2) : 'N/A'}`);
        console.log(`     Stop Loss: $${pick.stopLoss ? pick.stopLoss.toFixed(2) : 'N/A'}`);
        console.log(`     Signal: ${pick.signal.toUpperCase()}`);
        console.log(`     Confidence: ${pick.confidence}%`);
        console.log(`     Position Size: ${pick.positionSize.toFixed(2)} shares`);
        console.log(`     Risk/Reward: ${pick.riskRewardRatio}:1`);
        console.log(`     Suitability Score: ${pick.suitabilityScore}/100`);
        console.log(`     Trades Needed: ${pick.tradesNeeded}`);
        console.log(`     Required Win Rate: ${pick.winRateNeeded}%`);
      });
    } else {
      console.log('  No suitable picks found.');
    }

    console.log('\n=== STRATEGY ASSESSMENT ===\n');
    console.log(`Strategy: ${analysis.recommendations.strategy}`);
    console.log(`Risk Assessment: ${analysis.recommendations.riskAssessment}`);
    console.log(`Timeline: ${analysis.recommendations.timeline}`);
    console.log(`Success Probability: ${analysis.recommendations.successProbability}%`);

    console.log('\n═══════════════════════════════════════════════════════════\n');

    return analysis;
  }
}

module.exports = new SmallTraderAnalysis();
