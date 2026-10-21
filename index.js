/**
 * Depthquote - Stock Analysis Engine
 * Main Entry Point - Orchestrates all components
 * Uses Express.js to serve both API and frontend on localhost
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const apiService = require('./services/apiService');
const analysisEngine = require('./lib/analysis');
const dataScraper = require('./lib/data/dataScraper');
const technicalIndicators = require('./lib/indicators');
const patternRecognition = require('./lib/patterns');
const predictionEngine = require('./lib/prediction');

// Configuration
const DEFAULT_PORT = 3000;
const FRONTEND_PATH = path.join(__dirname, 'frontend');

// Global server reference
let serverInstance = null;

class Depthquote {
  constructor() {
    this.apiService = apiService;
    this.analysisEngine = analysisEngine;
    this.dataScraper = dataScraper;
    this.technicalIndicators = technicalIndicators;
    this.patternRecognition = patternRecognition;
    this.predictionEngine = predictionEngine;
  }

  /**
   * Start the Depthquote application
   * @param {object} options - Start options
   * @returns {Promise<object>} Engine instance
   */
  async start(options = {}) {
    const { port = DEFAULT_PORT, startApi = true, serveFrontend = true } = options;

    try {
      // Initialize all components
      await this._initializeComponents();

      // Start API server if requested
      if (startApi) {
        const server = await this.apiService.start(port, serveFrontend);
        serverInstance = server;
      }

      return this;
    } catch (error) {
      console.error('Failed to start Depthquote:', error);
      throw error;
    }
  }

  /**
   * Stop the Depthquote application
   * @returns {Promise}
   */
  async stop() {
    try {
      await this.apiService.stop();
      
      // Stop frontend server if running
      if (this.frontendServer) {
        await new Promise((resolve, reject) => {
          this.frontendServer.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      
      console.log('Depthquote stopped');
    } catch (error) {
      console.error('Error stopping Depthquote:', error);
      throw error;
    }
  }

  /**
   * Analyze a stock or list of stocks
   * @param {string|string[]} symbols - Stock symbol(s) to analyze
   * @param {object} options - Analysis options
   * @returns {Promise<object|object[]>} Analysis results
   */
  async analyze(symbols, options = {}) {
    return this.analysisEngine.analyze(symbols, options);
  }

  /**
   * Get summary of analysis
   * @param {object} result - Full analysis result
   * @returns {object} Analysis summary
   */
  getSummary(result) {
    return this.analysisEngine.getSummary(result);
  }

  /**
   * Get historical data for a stock
   * @param {string} symbol - Stock symbol
   * @param {object} options - Data fetch options
   * @returns {Promise<Array>} Historical data
   */
  async getHistoricalData(symbol, options = {}) {
    return this.dataScraper.fetchHistoricalData(symbol, options);
  }

  /**
   * Get current data for a stock
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Current data
   */
  async getCurrentData(symbol) {
    return this.dataScraper.getCurrentData(symbol);
  }

  /**
   * Get company information
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Company info
   */
  async getCompanyInfo(symbol) {
    return this.dataScraper.getCompanyInfo(symbol);
  }

  /**
   * Calculate technical indicators
   * @param {Array} data - OHLCV data
   * @param {object} options - Indicator options
   * @returns {Promise<Array>} Data with indicators
   */
  async calculateIndicators(data, options = {}) {
    return this.technicalIndicators.calculateAll(data, options);
  }

  /**
   * Calculate specific indicator
   * @param {Array} data - OHLCV data
   * @param {string} indicatorName - Name of indicator
   * @param {object} options - Indicator options
   * @returns {Array} Data with the specified indicator
   */
  calculateIndicator(data, indicatorName, options = {}) {
    return this.technicalIndicators.calculate(data, indicatorName, options);
  }

  /**
   * Identify patterns in data
   * @param {Array} data - OHLCV data
   * @param {object} options - Pattern detection options
   * @returns {Promise<Array>} Data with patterns
   */
  async identifyPatterns(data, options = {}) {
    return patternRecognition.identifyAll(data, options);
  }

  /**
   * Generate predictions
   * @param {Array} data - OHLCV data
   * @param {object} options - Prediction options
   * @returns {Promise<object>} Prediction results
   */
  async predict(data, options = {}) {
    return predictionEngine.predictAll(data, options);
  }

  /**
   * Get available technical indicators
   * @returns {Array} List of available indicators
   */
  getAvailableIndicators() {
    return this.technicalIndicators.getAvailableIndicators();
  }

  /**
   * Get available prediction models
   * @returns {object} Available models by category
   */
  getAvailableModels() {
    return this.predictionEngine.getAvailableModels();
  }

  /**
   * Get available pattern types
   * @returns {object} Available patterns by category
   */
  getAvailablePatterns() {
    return patternRecognition.getAvailablePatterns();
  }
}

// Export singleton instance
const depthquote = new Depthquote();
module.exports = depthquote;

// Start server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const serveFrontend = process.argv.includes('--no-frontend') ? false : true;
  
  depthquote.start({ port, serveFrontend })
    .then(() => {
      console.log('\n========================================');
      console.log('  Depthquote Server Started');
      console.log('========================================');
      console.log(`\nServer running at: http://localhost:${port}`);
      console.log(`API available at:   http://localhost:${port}/api`);
      
      const frontendPath = path.join(__dirname, 'frontend');
      if (serveFrontend && fs.existsSync(frontendPath)) {
        console.log(`Frontend available at: http://localhost:${port}`);
      }
      
      console.log('\nAvailable API Endpoints:');
      console.log('  GET  /api/health              - Health check');
      console.log('  POST /api/analyze            - Analyze stocks');
      console.log('  GET  /api/historical/:symbol - Get historical data');
      console.log('  GET  /api/indicators         - Calculate indicators');
      console.log('  GET  /api/patterns           - Identify patterns');
      console.log('  GET  /api/predictions        - Generate predictions');
      console.log('\n========================================');
      console.log('Press Ctrl+C to stop the server');
      console.log('========================================\n');
    })
    .catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}
