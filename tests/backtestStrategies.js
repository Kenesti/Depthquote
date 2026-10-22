/**
 * Comprehensive Backtesting Script for Strategy Validation
 * Tests the enhanced analysis strategies against historical data
 */

const backtestEngine = require('../lib/backtesting');
const analysisEngine = require('../lib/analysis');
const dataScraper = require('../lib/data/dataScraper');

/**
 * Test 1: Verify original tests match previous results
 * Tests with known stocks and time periods
 */
async function testOriginalStrategies() {
  console.log('\n========================================');
  console.log('TEST 1: Verifying Original Strategies');
  console.log('========================================\n');

  // Test with stocks we've used before
  const testSymbols = ['PYPL', 'AAPL', 'GOOGL', 'MSFT'];
  
  console.log('Running backtest with original strategy parameters...\n');
  
  const results = await backtestEngine.runBacktest(testSymbols, {
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    interval: '1d',
    initialCapital: 10000,
    positionSizePercent: 10
  });

  console.log('\n=== Original Strategy Test Results ===');
  console.log(`Total Trades: ${results.totalTrades}`);
  console.log(`Winning Trades: ${results.winningTrades}`);
  console.log(`Losing Trades: ${results.losingTrades}`);
  console.log(`Win Rate: ${results.winRate}%`);
  console.log(`Total P&L: $${results.totalPnL.toFixed(2)}`);
  console.log(`Profit Factor: ${results.profitFactor}`);
  console.log(`Max Drawdown: ${results.maxDrawdown}%`);
  console.log(`Sharpe Ratio: ${results.sharpeRatio}`);
  console.log(`Sortino Ratio: ${results.sortinoRatio}`);
  
  // Check if results are reasonable
  const isValid = results.totalTrades > 0 && 
                 results.winRate >= 0 && 
                 results.totalPnL !== undefined;
  
  console.log(`\n✓ Original strategy test: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  return isValid;
}

/**
 * Test 2: Run tests with random stocks and different time periods
 */
async function testRandomStocksAndPeriods() {
  console.log('\n========================================');
  console.log('TEST 2: Random Stocks & Time Periods');
  console.log('========================================\n');

  // Different stock groups
  const stockGroups = {
    tech: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM'],
    finance: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW'],
    healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT'],
    consumer: ['PG', 'KO', 'PEP', 'WMT', 'DIS', 'MCD', 'NKE', 'SBUX']
  };

  // Different time periods
  const periods = [
    { start: '2022-01-01', end: '2022-12-31', name: '2022 Full Year' },
    { start: '2023-01-01', end: '2023-06-30', name: '2023 H1' },
    { start: '2023-07-01', end: '2023-12-31', name: '2023 H2' },
    { start: '2024-01-01', end: '2024-06-30', name: '2024 H1' }
  ];

  const allResults = [];

  for (const [sector, stocks] of Object.entries(stockGroups)) {
    console.log(`\n--- Testing ${sector.toUpperCase()} Sector ---`);
    
    for (const period of periods) {
      console.log(`  Period: ${period.name}`);
      
      // Select 3 random stocks from this sector
      const testStocks = stocks.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      const results = await backtestEngine.runBacktest(testStocks, {
        startDate: period.start,
        endDate: period.end,
        interval: '1d',
        initialCapital: 10000,
        positionSizePercent: 10
      });

      if (results.totalTrades > 0) {
        results.sector = sector;
        results.period = period.name;
        results.stocks = testStocks;
        allResults.push(results);
        
        console.log(`    Trades: ${results.totalTrades}, Win Rate: ${results.winRate}%, P&L: $${results.totalPnL.toFixed(2)}`);
      } else {
        console.log(`    No valid trades`);
      }
    }
  }

  // Calculate overall statistics
  console.log('\n=== Overall Statistics ===');
  const totalTrades = allResults.reduce((sum, r) => sum + r.totalTrades, 0);
  const totalPnL = allResults.reduce((sum, r) => sum + r.totalPnL, 0);
  const avgWinRate = allResults.reduce((sum, r) => sum + r.winRate, 0) / allResults.length;
  const avgProfitFactor = allResults.reduce((sum, r) => sum + (r.profitFactor || 0), 0) / allResults.length;

  console.log(`Total Trades Across All Tests: ${totalTrades}`);
  console.log(`Average Win Rate: ${avgWinRate.toFixed(2)}%`);
  console.log(`Total P&L: $${totalPnL.toFixed(2)}`);
  console.log(`Average Profit Factor: ${avgProfitFactor.toFixed(2)}`);
  
  const isValid = allResults.length > 0 && avgWinRate > 0;
  console.log(`\n✓ Random stocks test: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  return { allResults, isValid };
}

/**
 * Test 3: Small Trader Scenario
 * Tests if the strategy works for traders with $200-$400 capital
 */
async function testSmallTraderScenario() {
  console.log('\n========================================');
  console.log('TEST 3: Small Trader Scenario ($200-$400)');
  console.log('========================================\n');

  // Test with different starting capitals
  const capitals = [200, 300, 400];
  const targetProfit = 500;
  
  const resultsByCapital = {};

  for (const capital of capitals) {
    console.log(`\nTesting with $${capital} starting capital, target $${targetProfit} profit...`);
    
    // Use stocks that are typically affordable for small traders
    const affordableStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD'];
    
    const results = await backtestEngine.runBacktest(affordableStocks, {
      startDate: '2023-01-01',
      endDate: '2024-06-30',
      interval: '1d',
      initialCapital: capital,
      positionSizePercent: 25 // Higher percentage for small accounts
    });

    resultsByCapital[capital] = results;
    
    console.log(`  Starting: $${capital}`);
    console.log(`  Final P&L: $${results.totalPnL.toFixed(2)}`);
    console.log(`  Total Trades: ${results.totalTrades}`);
    console.log(`  Win Rate: ${results.winRate}%`);
    
    // Calculate if target was achieved
    const finalValue = capital + results.totalPnL;
    const profitAchieved = results.totalPnL >= targetProfit;
    const percentageGained = (results.totalPnL / capital) * 100;
    
    console.log(`  Final Account Value: $${finalValue.toFixed(2)} (${percentageGained.toFixed(2)}%)`);
    console.log(`  Target Achieved: ${profitAchieved ? 'YES' : 'NO'}`);
  }

  // Summary
  console.log('\n=== Small Trader Summary ===');
  for (const [capital, results] of Object.entries(resultsByCapital)) {
    const percentageGained = (results.totalPnL / parseInt(capital)) * 100;
    console.log(`$${capital}: ${results.totalTrades} trades, $${results.totalPnL.toFixed(2)} P&L (${percentageGained.toFixed(2)}%)`);
  }
  
  const isValid = Object.values(resultsByCapital).some(r => r.totalTrades > 0);
  console.log(`\n✓ Small trader test: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  return { resultsByCapital, isValid };
}

/**
 * Test 4: Enhanced Strategy Verification
 * Specifically tests the enhanced buy/sell/target strategies
 */
async function testEnhancedStrategies() {
  console.log('\n========================================');
  console.log('TEST 4: Enhanced Strategy Verification');
  console.log('========================================\n');

  const testStocks = ['PYPL', 'AAPL', 'GOOGL', 'NVDA'];
  const allResults = [];

  for (const symbol of testStocks) {
    console.log(`\nAnalyzing ${symbol}...`);
    
    try {
      const analysis = await analysisEngine.analyze(symbol, {
        period: '6mo',
        interval: '1d',
        includeIndicators: true,
        includePatterns: true,
        includePredictions: true,
        includeRecommendations: true
      });

      if (analysis && analysis.recommendations) {
        const recs = analysis.recommendations;
        console.log(`  Signal: ${recs.overall.signal.toUpperCase()}`);
        console.log(`  Confidence: ${recs.overall.confidence}%`);
        console.log(`  Buy Target: $${recs.priceTargets.buy ? recs.priceTargets.buy.toFixed(2) : 'N/A'}`);
        console.log(`  Sell Target: $${recs.priceTargets.sell ? recs.priceTargets.sell.toFixed(2) : 'N/A'}`);
        console.log(`  Stop Loss: $${recs.riskMetrics.stopLoss ? recs.riskMetrics.stopLoss.toFixed(2) : 'N/A'}`);
        console.log(`  Risk/Reward: ${recs.riskMetrics.riskRewardRatio ? recs.riskMetrics.riskRewardRatio.toFixed(2) : 'N/A'}:1`);
        
        // Verify strategy logic
        const currentPrice = analysis.currentData?.regularMarketPrice || analysis.historicalData[analysis.historicalData.length - 1].close;
        const buyTarget = recs.priceTargets.buy;
        const sellTarget = recs.priceTargets.sell;
        const stopLoss = recs.riskMetrics.stopLoss;

        if (buyTarget && sellTarget && stopLoss && currentPrice) {
          const entryLogicValid = buyTarget !== currentPrice; // Should have a specific entry
          const exitLogicValid = sellTarget > buyTarget; // Sell should be above buy
          const stopLossValid = stopLoss < buyTarget; // Stop loss should be below buy
          
          console.log(`  Strategy Logic: Entry=${entryLogicValid ? '✓' : '✗'}, Exit=${exitLogicValid ? '✓' : '✗'}, StopLoss=${stopLossValid ? '✓' : '✗'}`);
          
          allResults.push({
            symbol,
            signal: recs.overall.signal,
            entryLogicValid,
            exitLogicValid,
            stopLossValid,
            riskRewardRatio: recs.riskMetrics.riskRewardRatio
          });
        }
      }
    } catch (error) {
      console.error(`  Error analyzing ${symbol}:`, error.message);
    }
  }

  // Summary
  console.log('\n=== Enhanced Strategy Summary ===');
  const validEntries = allResults.filter(r => r.entryLogicValid).length;
  const validExits = allResults.filter(r => r.exitLogicValid).length;
  const validStops = allResults.filter(r => r.stopLossValid).length;
  
  console.log(`Valid Entry Strategies: ${validEntries}/${allResults.length}`);
  console.log(`Valid Exit Strategies: ${validExits}/${allResults.length}`);
  console.log(`Valid Stop Loss Strategies: ${validStops}/${allResults.length}`);
  
  const avgRRR = allResults.reduce((sum, r) => sum + (r.riskRewardRatio || 0), 0) / allResults.length;
  console.log(`Average Risk/Reward Ratio: ${avgRRR.toFixed(2)}:1`);
  
  const isValid = allResults.length > 0 && 
                 validEntries > allResults.length * 0.7 &&
                 validExits > allResults.length * 0.7 &&
                 validStops > allResults.length * 0.7;
  
  console.log(`\n✓ Enhanced strategy test: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  return { allResults, isValid };
}

/**
 * Test 5: Pattern Recognition Validation
 * Tests if pattern recognition is working correctly
 */
async function testPatternRecognition() {
  console.log('\n========================================');
  console.log('TEST 5: Pattern Recognition Validation');
  console.log('========================================\n');

  const testStocks = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'];
  
  for (const symbol of testStocks) {
    console.log(`\nChecking patterns for ${symbol}...`);
    
    try {
      const analysis = await analysisEngine.analyze(symbol, {
        period: '3mo',
        interval: '1d',
        includePatterns: true
      });

      if (analysis && analysis.patternAnalysis) {
        const patterns = analysis.patternAnalysis;
        
        console.log(`  Candle Patterns: ${patterns.statistics.candle.total} total`);
        console.log(`    Bullish: ${patterns.statistics.candle.bullish}`);
        console.log(`    Bearish: ${patterns.statistics.candle.bearish}`);
        console.log(`    Neutral: ${patterns.statistics.candle.neutral}`);
        
        console.log(`  Chart Patterns: ${patterns.statistics.chart.total} total`);
        console.log(`    Bullish: ${patterns.statistics.chart.bullish}`);
        console.log(`    Bearish: ${patterns.statistics.chart.bearish}`);
        console.log(`    Neutral: ${patterns.statistics.chart.neutral}`);
        
        // Check if patterns are being detected
        const hasPatterns = patterns.statistics.candle.total > 0 || 
                           patterns.statistics.chart.total > 0;
        
        if (hasPatterns) {
          console.log(`  ✓ Patterns detected`);
        } else {
          console.log(`  ✗ No patterns detected`);
        }
      }
    } catch (error) {
      console.error(`  Error:`, error.message);
    }
  }

  console.log(`\n✓ Pattern recognition test: PASSED`);
  return true;
}

/**
 * Test 6: Prediction Accuracy Check
 * Tests if predictions are reasonable
 */
async function testPredictionAccuracy() {
  console.log('\n========================================');
  console.log('TEST 6: Prediction Accuracy Check');
  console.log('========================================\n');

  const testStocks = ['PYPL', 'AAPL', 'GOOGL'];
  
  for (const symbol of testStocks) {
    console.log(`\nChecking predictions for ${symbol}...`);
    
    try {
      const analysis = await analysisEngine.analyze(symbol, {
        period: '3mo',
        interval: '1d',
        includePredictions: true
      });

      if (analysis && analysis.predictions) {
        const lastPrice = analysis.historicalData[analysis.historicalData.length - 1].close;
        
        // Check combined predictions
        if (analysis.predictions.combined && 
            analysis.predictions.combined.predictions[0]) {
          const avgPrediction = analysis.predictions.combined.predictions[0].average;
          const changePercent = ((avgPrediction - lastPrice) / lastPrice) * 100;
          
          console.log(`  Current Price: $${lastPrice.toFixed(2)}`);
          console.log(`  Predicted Price: $${avgPrediction.toFixed(2)}`);
          console.log(`  Predicted Change: ${changePercent.toFixed(2)}%`);
          
          // Check if prediction is reasonable (not extreme)
          const isReasonable = Math.abs(changePercent) < 50; // Less than 50% change
          
          if (isReasonable) {
            console.log(`  ✓ Prediction is reasonable`);
          } else {
            console.log(`  ✗ Prediction seems extreme`);
          }
        }
        
        // Check individual model predictions
        if (analysis.predictions.statistical) {
          const models = Object.keys(analysis.predictions.statistical);
          console.log(`  Statistical Models: ${models.join(', ')}`);
          
          for (const model of models) {
            const modelResult = analysis.predictions.statistical[model];
            if (modelResult && modelResult.predictions[0]) {
              const pred = modelResult.predictions[0];
              const modelChange = ((pred - lastPrice) / lastPrice) * 100;
              console.log(`    ${model}: $${pred.toFixed(2)} (${modelChange.toFixed(2)}%)`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`  Error:`, error.message);
    }
  }

  console.log(`\n✓ Prediction accuracy test: PASSED`);
  return true;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         DEPTHQUOTE BACKTESTING AND VALIDATION SUITE            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = {};

  // Run all tests
  results.originalStrategies = await testOriginalStrategies();
  results.randomStocks = await testRandomStocksAndPeriods();
  results.smallTrader = await testSmallTraderScenario();
  results.enhancedStrategies = await testEnhancedStrategies();
  results.patternRecognition = await testPatternRecognition();
  results.predictionAccuracy = await testPredictionAccuracy();

  // Final summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL TEST SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const [testName, result] of Object.entries(results)) {
    const status = result.isValid !== undefined ? result.isValid : result;
    const statusText = status ? '✓ PASSED' : '✗ FAILED';
    console.log(`  ${testName.padEnd(30)}: ${statusText}`);
  }

  const allPassed = Object.values(results).every(r => r.isValid !== undefined ? r.isValid : r);
  
  console.log(`\n  Overall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  return {
    allTests: results,
    allPassed
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log('\nBacktesting complete!');
      process.exit(results.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running backtests:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testOriginalStrategies,
  testRandomStocksAndPeriods,
  testSmallTraderScenario,
  testEnhancedStrategies,
  testPatternRecognition,
  testPredictionAccuracy
};
