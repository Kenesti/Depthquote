/**
 * Test Script for Small Trader Analysis
 * Tests the small trader strategy with historical data
 */

const smallTraderAnalysis = require('../lib/backtesting/smallTraderAnalysis');
const analysisEngine = require('../lib/analysis');

/**
 * Test small trader with different capital amounts
 */
async function testSmallTraderWithDifferentCapitals() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         SMALL TRADER TEST WITH DIFFERENT CAPITALS             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const capitals = [200, 300, 400];
  const targetProfit = 500;

  for (const capital of capitals) {
    console.log(`\n=== Testing with $${capital} capital, $${targetProfit} target ===\n`);
    
    try {
      const result = await smallTraderAnalysis.runSimulation(capital, targetProfit);
      
      console.log(`\nSummary for $${capital}:`);
      console.log(`  Top Picks: ${result.recommendations.topPicks.length}`);
      console.log(`  Success Probability: ${result.recommendations.successProbability}%`);
      
      if (result.recommendations.topPicks.length > 0) {
        const bestPick = result.recommendations.topPicks[0];
        console.log(`\n  Best Pick: ${bestPick.symbol}`);
        console.log(`    Suitability Score: ${bestPick.suitabilityScore}/100`);
        console.log(`    Risk/Reward: ${bestPick.riskRewardRatio}:1`);
        console.log(`    Trades Needed: ${bestPick.tradesNeeded}`);
        console.log(`    Required Win Rate: ${bestPick.winRateNeeded}%`);
      }
    } catch (error) {
      console.error(`Error with $${capital}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Test small trader with historical backtesting
 * Uses past data to verify if the strategy would have worked
 */
async function testSmallTraderHistoricalBacktest() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       SMALL TRADER HISTORICAL BACKTESTING TEST                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Test with specific historical periods
  const testCases = [
    {
      name: '2023 Bull Market',
      startDate: '2023-01-01',
      endDate: '2023-06-30',
      capital: 300,
      targetProfit: 500
    },
    {
      name: '2023 Bear Market',
      startDate: '2023-07-01',
      endDate: '2023-12-31',
      capital: 300,
      targetProfit: 500
    },
    {
      name: '2024 Recovery',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      capital: 300,
      targetProfit: 500
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===\n`);
    console.log(`Period: ${testCase.startDate} to ${testCase.endDate}`);
    console.log(`Capital: $${testCase.capital}`);
    console.log(`Target: $${testCase.targetProfit}\n`);

    try {
      // Run analysis for this period
      const result = await smallTraderAnalysis.analyzeForSmallTrader(
        testCase.capital,
        testCase.targetProfit,
        {
          positionSizePercent: 25
        }
      );

      console.log(`Results:`);
      console.log(`  Top Picks: ${result.recommendations.topPicks.length}`);
      console.log(`  Success Probability: ${result.recommendations.successProbability}%`);
      console.log(`  Strategy: ${result.recommendations.strategy}`);

      if (result.recommendations.topPicks.length > 0) {
        const bestPick = result.recommendations.topPicks[0];
        console.log(`\n  Best Opportunity: ${bestPick.symbol}`);
        console.log(`    Entry: $${bestPick.buyTarget.toFixed(2)}`);
        console.log(`    Target: $${bestPick.sellTarget ? bestPick.sellTarget.toFixed(2) : 'N/A'}`);
        console.log(`    Stop Loss: $${bestPick.stopLoss ? bestPick.stopLoss.toFixed(2) : 'N/A'}`);
        console.log(`    Risk/Reward: ${bestPick.riskRewardRatio}:1`);
        console.log(`    Trades Needed: ${bestPick.tradesNeeded}`);
      }
    } catch (error) {
      console.error(`Error in ${testCase.name}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Test specific stocks with small trader analysis
 */
async function testSpecificStocks() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           TESTING SPECIFIC STOCKS FOR SMALL TRADERS            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const stocksToTest = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMD', 'F', 'T'];
  const capital = 300;
  const targetProfit = 500;

  for (const symbol of stocksToTest) {
    console.log(`\n=== Analyzing ${symbol} ===\n`);

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
        const currentPrice = analysis.currentData?.regularMarketPrice || 
                           analysis.historicalData[analysis.historicalData.length - 1].close;
        const recommendations = analysis.recommendations;

        console.log(`Current Price: $${currentPrice.toFixed(2)}`);
        console.log(`Signal: ${recommendations.overall.signal.toUpperCase()}`);
        console.log(`Confidence: ${recommendations.overall.confidence}%`);
        console.log(`Buy Target: $${recommendations.priceTargets.buy?.toFixed(2) || 'N/A'}`);
        console.log(`Sell Target: $${recommendations.priceTargets.sell?.toFixed(2) || 'N/A'}`);
        console.log(`Stop Loss: $${recommendations.riskMetrics.stopLoss?.toFixed(2) || 'N/A'}`);

        // Small trader specific calculations
        const positionSizePercent = 25;
        const positionSize = (capital * (positionSizePercent / 100)) / currentPrice;
        const riskPerShare = currentPrice - (recommendations.riskMetrics.stopLoss || currentPrice * 0.98);
        const totalRisk = riskPerShare * positionSize;
        const rewardPerShare = (recommendations.priceTargets.sell || currentPrice * 1.03) - currentPrice;
        const totalReward = rewardPerShare * positionSize;
        const riskRewardRatio = rewardPerShare / Math.max(riskPerShare, 0.01);

        console.log(`\nSmall Trader Metrics (with $${capital}):`);
        console.log(`  Position Size: ${positionSize.toFixed(2)} shares`);
        console.log(`  Entry Cost: $${(currentPrice * positionSize).toFixed(2)}`);
        console.log(`  Risk per Trade: $${totalRisk.toFixed(2)} (${((totalRisk / capital) * 100).toFixed(2)}%)`);
        console.log(`  Reward per Trade: $${totalReward.toFixed(2)} (${((totalReward / capital) * 100).toFixed(2)}%)`);
        console.log(`  Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}:1`);

        const tradesNeeded = Math.ceil(targetProfit / totalReward);
        console.log(`  Trades Needed for $${targetProfit}: ${tradesNeeded}`);

        // Suitability assessment
        let suitability = 'Good';
        if (riskRewardRatio >= 2 && recommendations.overall.confidence >= 70) {
          suitability = 'Excellent';
        } else if (riskRewardRatio >= 1.5 && recommendations.overall.confidence >= 60) {
          suitability = 'Good';
        } else if (riskRewardRatio >= 1 && recommendations.overall.confidence >= 50) {
          suitability = 'Fair';
        } else {
          suitability = 'Poor';
        }

        console.log(`  Suitability: ${suitability}`);
      }
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Test the complete small trader workflow
 */
async function testCompleteWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              COMPLETE SMALL TRADER WORKFLOW TEST                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const capital = 300;
  const targetProfit = 500;

  console.log(`Testing complete workflow with $${capital} capital and $${targetProfit} target profit...\n`);

  try {
    // Step 1: Run simulation
    console.log('Step 1: Running small trader simulation...\n');
    const simulation = await smallTraderAnalysis.runSimulation(capital, targetProfit);

    console.log('\nStep 2: Analyzing top picks...\n');
    
    if (simulation.recommendations.topPicks.length > 0) {
      const topPick = simulation.recommendations.topPicks[0];
      console.log(`Top Pick: ${topPick.symbol}`);
      console.log(`  Suitability Score: ${topPick.suitabilityScore}/100`);
      console.log(`  Risk/Reward: ${topPick.riskRewardRatio}:1`);
      console.log(`  Required Win Rate: ${topPick.winRateNeeded}%`);
      console.log(`  Trades Needed: ${topPick.tradesNeeded}`);

      // Step 3: Detailed analysis of top pick
      console.log('\nStep 3: Detailed analysis of top pick...\n');
      
      const detailedAnalysis = await analysisEngine.analyze(topPick.symbol, {
        period: '6mo',
        interval: '1d',
        includeIndicators: true,
        includePatterns: true,
        includePredictions: true,
        includeRecommendations: true
      });

      if (detailedAnalysis) {
        console.log(`\nDetailed Analysis for ${topPick.symbol}:`);
        console.log(`  Current Price: $${detailedAnalysis.currentData?.regularMarketPrice?.toFixed(2) || 'N/A'}`);
        console.log(`  Signal: ${detailedAnalysis.recommendations.overall.signal.toUpperCase()}`);
        console.log(`  Confidence: ${detailedAnalysis.recommendations.overall.confidence}%`);
        
        // Check technical indicators
        if (detailedAnalysis.technicalAnalysis) {
          console.log(`\n  Technical Analysis:`);
          console.log(`    Trend: ${detailedAnalysis.technicalAnalysis.trend.overall}`);
          console.log(`    Momentum: ${detailedAnalysis.technicalAnalysis.momentum.overall}`);
          console.log(`    Interpretation: ${detailedAnalysis.technicalAnalysis.trend.interpretation}`);
        }

        // Check pattern analysis
        if (detailedAnalysis.patternAnalysis) {
          console.log(`\n  Pattern Analysis:`);
          console.log(`    Candle Patterns: ${detailedAnalysis.patternAnalysis.statistics.candle.total}`);
          console.log(`    Chart Patterns: ${detailedAnalysis.patternAnalysis.statistics.chart.total}`);
          console.log(`    Interpretation: ${detailedAnalysis.patternAnalysis.interpretation}`);
        }

        // Check predictions
        if (detailedAnalysis.predictions && detailedAnalysis.predictions.combined) {
          const lastPrice = detailedAnalysis.historicalData[detailedAnalysis.historicalData.length - 1].close;
          const avgPrediction = detailedAnalysis.predictions.combined.predictions[0]?.average;
          const changePercent = ((avgPrediction - lastPrice) / lastPrice) * 100;
          
          console.log(`\n  Predictions:`);
          console.log(`    Current Price: $${lastPrice.toFixed(2)}`);
          console.log(`    Predicted Price: $${avgPrediction?.toFixed(2) || 'N/A'}`);
          console.log(`    Predicted Change: ${changePercent.toFixed(2)}%`);
        }
      }
    }

    // Final assessment
    console.log('\n=== FINAL ASSESSMENT ===\n');
    console.log(`Success Probability: ${simulation.recommendations.successProbability}%`);
    console.log(`Strategy: ${simulation.recommendations.strategy}`);
    console.log(`Risk Assessment: ${simulation.recommendations.riskAssessment}`);
    console.log(`Timeline: ${simulation.recommendations.timeline}`);

    // Determine if strategy is viable
    const isViable = simulation.recommendations.successProbability >= 60 &&
                    simulation.recommendations.topPicks.length > 0;

    console.log(`\nConclusion: The strategy is ${isViable ? 'VIABLE' : 'NOT VIABLE'} for a small trader with $${capital}.`);

  } catch (error) {
    console.error('Error in workflow:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SMALL TRADER COMPREHENSIVE TEST SUITE               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  await testSmallTraderWithDifferentCapitals();
  await testSpecificStocks();
  await testCompleteWorkflow();

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL TESTS COMPLETED                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('Small trader tests complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error running small trader tests:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testSmallTraderWithDifferentCapitals,
  testSmallTraderHistoricalBacktest,
  testSpecificStocks,
  testCompleteWorkflow
};
