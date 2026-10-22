/**
 * Backtesting Engine for Depthquote
 * Runs historical tests on the analysis engine to validate strategy performance
 */

const analysisEngine = require('../analysis');
const dataScraper = require('../data/dataScraper');

class BacktestEngine {
  constructor() {
    this.results = [];
    this.summary = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0
    };
  }

  /**
   * Run backtest on a single stock
   * @param {string} symbol - Stock symbol
   * @param {object} options - Backtest options
   * @returns {Promise<object>} Backtest results for this stock
   */
  async runSingleStockBacktest(symbol, options = {}) {
    const {
      startDate = '2023-01-01',
      endDate = '2024-12-31',
      interval = '1d',
      initialCapital = 10000,
      positionSizePercent = 10,
      useEnhancedStrategy = true
    } = options;

    try {
      // Fetch historical data for the full period
      const historicalData = await dataScraper.fetchHistoricalData(symbol, {
        period: '5y',
        interval
      });

      if (!historicalData || historicalData.length < 100) {
        console.log(`Insufficient data for ${symbol}, skipping...`);
        return null;
      }

      // Filter data to the backtest period
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();
      
      const filteredData = historicalData.filter(d => {
        const date = new Date(d.date).getTime();
        return date >= startTimestamp && date <= endTimestamp;
      });

      if (filteredData.length < 20) {
        console.log(`Insufficient data for ${symbol} in period, skipping...`);
        return null;
      }

      // Run analysis at regular intervals
      const results = [];
      const tradeInterval = Math.max(Math.floor(filteredData.length / 20), 5);
      
      for (let i = 0; i < filteredData.length; i += tradeInterval) {
        const analysisData = filteredData.slice(0, i + 1);
        
        if (analysisData.length < 20) continue;

        // Run analysis with the sliced data
        // Pass the actual data instead of period to avoid date confusion
        const analysis = await analysisEngine.analyze(symbol, {
          period: analysisData,
          interval,
          includeIndicators: true,
          includePatterns: true,
          includePredictions: true,
          includeRecommendations: true
        });

        if (!analysis || !analysis.recommendations) {
          continue;
        }

        const result = analysis;
        const recommendations = result.recommendations;
        
        if (!recommendations || recommendations.overall.signal === 'neutral') {
          continue;
        }

        const currentIndex = i;
        const currentPrice = analysisData[analysisData.length - 1].close;
        const buyTarget = recommendations.priceTargets.buy;
        const sellTarget = recommendations.priceTargets.sell;
        const stopLoss = recommendations.riskMetrics.stopLoss;
        const signal = recommendations.overall.signal;

        // Only trade if we have valid targets, signal is bullish, and sell > buy
        if (!buyTarget || !sellTarget || !stopLoss || signal !== 'bullish' || sellTarget <= buyTarget) {
          continue;
        }

        // Determine entry and exit
        let entryPrice = buyTarget;
        let exitPrice = null;
        let exitIndex = null;
        let pnl = 0;
        let isWinner = false;

        // For bullish signals, we only enter long positions
        // Entry: buy at buyTarget (or next available price)
        entryPrice = buyTarget;
        
        // Find exit: sell at sellTarget or stopLoss
        for (let j = currentIndex + 1; j < filteredData.length; j++) {
          const price = filteredData[j].close;
          
          if (price >= sellTarget) {
            exitPrice = sellTarget;
            exitIndex = j;
            isWinner = true;
            break;
          }
          
          if (price <= stopLoss) {
            exitPrice = stopLoss;
            exitIndex = j;
            isWinner = false;
            break;
          }
        }
        
        // If no exit found, use last price
        if (exitPrice === null) {
          exitPrice = filteredData[filteredData.length - 1].close;
          exitIndex = filteredData.length - 1;
          isWinner = exitPrice > entryPrice;
        }

        // Calculate P&L
        if (entryPrice && exitPrice) {
          const shares = (initialCapital * (positionSizePercent / 100)) / entryPrice;
          pnl = (exitPrice - entryPrice) * shares * (signal === 'bearish' ? -1 : 1);
          
          const daysHeld = exitIndex - currentIndex;
          
          results.push({
            symbol,
            signal,
            entryDate: filteredData[currentIndex].date,
            exitDate: filteredData[exitIndex].date,
            entryPrice,
            exitPrice,
            stopLoss,
            sellTarget,
            pnl,
            pnlPercent: (pnl / (initialCapital * positionSizePercent / 100)) * 100,
            isWinner,
            daysHeld,
            confidence: recommendations.overall.confidence,
            riskRewardRatio: recommendations.riskMetrics.riskRewardRatio
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`Error backtesting ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Run backtest on multiple stocks
   * @param {string[]} symbols - Array of stock symbols
   * @param {object} options - Backtest options
   * @returns {Promise<object>} Combined backtest results
   */
  async runBacktest(symbols, options = {}) {
    const {
      startDate = '2023-01-01',
      endDate = '2024-12-31',
      interval = '1d',
      initialCapital = 10000,
      positionSizePercent = 10
    } = options;

    console.log(`\n=== Starting Backtest ===`);
    console.log(`Symbols: ${symbols.join(', ')}`);
    console.log(`Period: ${startDate} to ${endDate}`);
    console.log(`Interval: ${interval}`);
    console.log(`Initial Capital: $${initialCapital}`);
    console.log(`Position Size: ${positionSizePercent}%`);
    console.log('==========================\n');

    const allResults = [];
    
    for (const symbol of symbols) {
      console.log(`Backtesting ${symbol}...`);
      const results = await this.runSingleStockBacktest(symbol, {
        startDate,
        endDate,
        interval,
        initialCapital,
        positionSizePercent
      });
      
      if (results && results.length > 0) {
        allResults.push(...results);
        console.log(`  ${results.length} trades for ${symbol}`);
      } else {
        console.log(`  No valid trades for ${symbol}`);
      }
    }

    if (allResults.length === 0) {
      console.log('\nNo valid trades found in backtest.');
      return this.summary;
    }

    // Calculate summary statistics
    this.results = allResults;
    this.summary = this._calculateSummary(allResults);

    // Print results
    this._printResults();

    return this.summary;
  }

  /**
   * Calculate summary statistics from trade results
   * @param {Array} results - Array of trade results
   * @returns {object} Summary statistics
   */
  _calculateSummary(results) {
    const winningTrades = results.filter(r => r.isWinner);
    const losingTrades = results.filter(r => !r.isWinner);
    const totalTrades = results.length;
    
    const totalPnL = results.reduce((sum, r) => sum + r.pnl, 0);
    const totalWin = winningTrades.reduce((sum, r) => sum + r.pnl, 0);
    const totalLoss = losingTrades.reduce((sum, r) => sum + r.pnl, 0);
    
    const avgWin = winningTrades.length > 0 ? totalWin / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(totalLoss / losingTrades.length) : 0;
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor = Math.abs(totalLoss) > 0 ? totalWin / Math.abs(totalLoss) : 0;

    // Calculate max drawdown
    let runningPnL = 0;
    let maxPeak = 0;
    let maxDrawdown = 0;
    
    for (const trade of results) {
      runningPnL += trade.pnl;
      if (runningPnL > maxPeak) {
        maxPeak = runningPnL;
      }
      const drawdown = ((maxPeak - runningPnL) / maxPeak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe and Sortino ratios (simplified)
    const pnlValues = results.map(r => r.pnl);
    const avgPnL = pnlValues.reduce((sum, v) => sum + v, 0) / pnlValues.length;
    const stdDev = Math.sqrt(pnlValues.reduce((sum, v) => sum + Math.pow(v - avgPnL, 2), 0) / pnlValues.length);
    const riskFreeRate = 0; // Assuming 0% for simplicity
    const sharpeRatio = stdDev > 0 ? (avgPnL - riskFreeRate) / stdDev : 0;
    
    const downsideDeviation = Math.sqrt(
      pnlValues.filter(v => v < 0).reduce((sum, v) => sum + Math.pow(v - avgPnL, 2), 0) / 
      pnlValues.filter(v => v < 0).length
    );
    const sortinoRatio = downsideDeviation > 0 ? (avgPnL - riskFreeRate) / downsideDeviation : 0;

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      totalWin,
      totalLoss,
      symbolCount: new Set(results.map(r => r.symbol)).size
    };
  }

  /**
   * Print formatted results
   */
  _printResults() {
    const s = this.summary;
    
    console.log('\n=== Backtest Summary ===');
    console.log(`Total Trades: ${s.totalTrades}`);
    console.log(`Winning Trades: ${s.winningTrades}`);
    console.log(`Losing Trades: ${s.losingTrades}`);
    console.log(`Win Rate: ${s.winRate}%`);
    console.log(`Total P&L: $${s.totalPnL.toFixed(2)}`);
    console.log(`Avg Win: $${s.avgWin.toFixed(2)}`);
    console.log(`Avg Loss: $${s.avgLoss.toFixed(2)}`);
    console.log(`Profit Factor: ${s.profitFactor}`);
    console.log(`Max Drawdown: ${s.maxDrawdown}%`);
    console.log(`Sharpe Ratio: ${s.sharpeRatio}`);
    console.log(`Sortino Ratio: ${s.sortinoRatio}`);
    console.log('========================\n');

    // Print detailed trade log
    console.log('=== Trade Details ===');
    for (const trade of this.results) {
      const status = trade.isWinner ? 'WIN' : 'LOSS';
      const color = trade.isWinner ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${status}${reset} | ${trade.symbol} | ${trade.signal.toUpperCase()} | ` +
        `Entry: $${trade.entryPrice.toFixed(2)} | Exit: $${trade.exitPrice.toFixed(2)} | ` +
        `P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%) | ` +
        `Held: ${trade.daysHeld} days | Confidence: ${trade.confidence}% | ` +
        `RRR: ${trade.riskRewardRatio ? trade.riskRewardRatio.toFixed(2) : 'N/A'}:1`);
    }
    console.log('=======================\n');
  }

  /**
   * Generate detailed report
   * @returns {string} Formatted report
   */
  generateReport() {
    const s = this.summary;
    
    let report = '# Backtesting Report\n\n';
    report += `## Summary Statistics\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Trades | ${s.totalTrades} |\n`;
    report += `| Winning Trades | ${s.winningTrades} |\n`;
    report += `| Losing Trades | ${s.losingTrades} |\n`;
    report += `| Win Rate | ${s.winRate}% |\n`;
    report += `| Total P&L | $${s.totalPnL.toFixed(2)} |\n`;
    report += `| Avg Win | $${s.avgWin.toFixed(2)} |\n`;
    report += `| Avg Loss | $${s.avgLoss.toFixed(2)} |\n`;
    report += `| Profit Factor | ${s.profitFactor} |\n`;
    report += `| Max Drawdown | ${s.maxDrawdown}% |\n`;
    report += `| Sharpe Ratio | ${s.sharpeRatio} |\n`;
    report += `| Sortino Ratio | ${s.sortinoRatio} |\n`;
    report += `| Symbols Tested | ${s.symbolCount} |\n\n`;

    report += `## Trade Details\n\n`;
    report += `| # | Symbol | Signal | Entry | Exit | P&L | P&L% | Days | Winner |\n`;
    report += `|---|--------|--------|-------|------|-----|------|------|--------|\n`;
    
    for (let i = 0; i < this.results.length; i++) {
      const trade = this.results[i];
      const status = trade.isWinner ? '✅' : '❌';
      report += `| ${i + 1} | ${trade.symbol} | ${trade.signal.toUpperCase()} | $${trade.entryPrice.toFixed(2)} | $${trade.exitPrice.toFixed(2)} | $${trade.pnl.toFixed(2)} | ${trade.pnlPercent.toFixed(2)}% | ${trade.daysHeld} | ${status} |\n`;
    }

    return report;
  }

  /**
   * Clear results
   */
  clearResults() {
    this.results = [];
    this.summary = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0
    };
  }
}

module.exports = new BacktestEngine();
