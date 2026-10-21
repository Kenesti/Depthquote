/**
 * Depthquote - Stock Analysis Platform
 * Professional dark theme with Coinbase Pro-inspired design
 */

// ===================================================================
// Configuration & Constants
// ===================================================================

const CONFIG = {
    API_BASE_URL: window.location.origin + '/api',
    // Time period mappings (Yahoo Finance compatible)
    PERIOD_MAP: {
        '1h': { period: '1d', interval: '1h' },
        '6h': { period: '1d', interval: '15m' },
        '1d': { period: '1d', interval: '1h' },
        '7d': { period: '7d', interval: '1d' },
        '1mo': { period: '1mo', interval: '1d' },
        '1y': { period: '1y', interval: '1d' },
        '5y': { period: '5y', interval: '1mo' }
    },
    // Popular stocks for suggestions
    POPULAR_STOCKS: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'GOOG', name: 'Alphabet Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' },
        { symbol: 'META', name: 'Meta Platforms Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation' },
        { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
        { symbol: 'CMCSA', name: 'Comcast Corporation' },
        { symbol: 'COIN', name: 'Coinbase Global Inc.' },
        { symbol: 'AMD', name: 'Advanced Micro Devices' },
        { symbol: 'INTC', name: 'Intel Corporation' },
        { symbol: 'T', name: 'AT&T Inc.' },
        { symbol: 'V', name: 'Visa Inc.' },
        { symbol: 'MA', name: 'Mastercard Inc.' },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
        { symbol: 'BAC', name: 'Bank of America' },
        { symbol: 'WMT', name: 'Walmart Inc.' },
        { symbol: 'DIS', name: 'The Walt Disney Company' },
        { symbol: 'NFLX', name: 'Netflix Inc.' },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
        { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' },
        { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
        { symbol: 'GLD', name: 'SPDR Gold Shares' },
        { symbol: 'SLV', name: 'iShares Silver Trust' },
        { symbol: 'USO', name: 'United States Oil Fund' },
        { symbol: 'BTC-USD', name: 'Bitcoin USD' },
        { symbol: 'ETH-USD', name: 'Ethereum USD' }
    ],
    // Analysis steps
    ANALYSIS_STEPS: [
        { step: 0, label: 'Validating stocks', icon: 'fa-check' },
        { step: 1, label: 'Fetching historical data', icon: 'fa-download' },
        { step: 2, label: 'Calculating indicators', icon: 'fa-calculator' },
        { step: 3, label: 'Detecting patterns', icon: 'fa-chart-candlestick' },
        { step: 4, label: 'Running predictions', icon: 'fa-brain' },
        { step: 5, label: 'Generating recommendations', icon: 'fa-chart-line' }
    ]
};

// ===================================================================
// State Management
// ===================================================================

const state = {
    selectedStocks: [],
    selectedPeriod: '7d',
    analysisInProgress: false,
    analysisResults: null,
    settings: {
        showIndicators: true,
        showPatterns: true,
        showPredictions: true,
        showInterpretations: true
    },
    charts: {}
};

// ===================================================================
// DOM Elements
// ===================================================================

const elements = {
    // Stock Selection
    stockSearch: document.getElementById('stockSearch'),
    suggestionsList: document.getElementById('suggestionsList'),
    selectedStocksList: document.getElementById('selectedStocksList'),
    
    // Period Selection
    periodButtons: document.querySelectorAll('.period-btn'),
    
    // Analysis
    analyzeBtn: document.getElementById('analyzeBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    progressSteps: document.getElementById('progressSteps'),
    cancelAnalysis: document.getElementById('cancelAnalysis'),
    
    // Results
    resultsContainer: document.getElementById('resultsContainer'),
    summaryCards: document.getElementById('summaryCards'),
    stockResults: document.getElementById('stockResults'),
    
    // Quick Stats
    bullishCount: document.getElementById('bullishCount'),
    bearishCount: document.getElementById('bearishCount'),
    neutralCount: document.getElementById('neutralCount'),
    avgConfidence: document.getElementById('avgConfidence'),
    
    // Activity
    activityList: document.getElementById('activityList'),
    
    // Modals
    settingsModal: document.getElementById('settingsModal'),
    stockDetailModal: document.getElementById('stockDetailModal'),
    detailSymbol: document.getElementById('detailSymbol'),
    stockDetailBody: document.getElementById('stockDetailBody'),
    
    // Settings
    showIndicators: document.getElementById('showIndicators'),
    showPatterns: document.getElementById('showPatterns'),
    showPredictions: document.getElementById('showPredictions'),
    showInterpretations: document.getElementById('showInterpretations'),
    saveSettings: document.getElementById('saveSettings'),
    
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    
    // Export
    exportJson: document.getElementById('exportJson'),
    exportPdf: document.getElementById('exportPdf')
};

// ===================================================================
// Utility Functions
// ===================================================================

const utils = {
    // Format price
    formatPrice: (price) => {
        if (price === null || price === undefined) return 'N/A';
        return '$' + price.toFixed(2);
    },
    
    // Format percentage
    formatPercent: (value) => {
        if (value === null || value === undefined) return 'N/A';
        const sign = value >= 0 ? '+' : '';
        return sign + value.toFixed(2) + '%';
    },
    
    // Format number with commas
    formatNumber: (num) => {
        if (num === null || num === undefined) return 'N/A';
        return num.toLocaleString();
    },
    
    // Capitalize first letter
    capitalize: (str) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Get signal color class
    getSignalClass: (signal) => {
        const signalLower = signal.toLowerCase();
        if (signalLower.includes('bullish')) return 'bullish';
        if (signalLower.includes('bearish')) return 'bearish';
        return 'neutral';
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Generate random ID
    generateId: () => {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    },
    
    // Format date
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // Escape HTML
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===================================================================
// API Functions
// ===================================================================

const api = {
    // Fetch analysis for symbols
    async analyze(symbols, options = {}) {
        try {
            // Validate symbols
            const symbolList = Array.isArray(symbols) ? symbols : [symbols];
            const validSymbols = symbolList.filter(s => s && s.trim() !== '');
            
            if (validSymbols.length === 0) {
                throw new Error('No valid symbols provided');
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbols: validSymbols,
                    ...options
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Analysis failed');
            }
            
            const data = await response.json();
            // Extract results array from response
            return data.results || data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Get historical data
    async getHistorical(symbol, options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`${CONFIG.API_BASE_URL}/historical/${symbol}?${params}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to fetch historical data');
            }
            
            const data = await response.json();
            // Extract data array from response
            return data.data || data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Get indicators
    async getIndicators(symbol, options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`${CONFIG.API_BASE_URL}/indicators/${symbol}?${params}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to fetch indicators');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

// ===================================================================
// Chart Functions
// ===================================================================

// Register financial chart types
if (typeof Chart !== 'undefined') {
    try {
        // These are provided by chartjs-chart-financial
        Chart.register(Chart.controllers.CandlestickController, Chart.controllers.OhlcController);
    } catch (e) {
        console.warn('Financial chart controllers not available:', e);
    }
}

const charts = {
    // Chart colors
    colors: {
        primary: '#1652f0',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        bullish: '#10b981',
        bearish: '#ef4444',
        neutral: '#6b7280',
        grid: '#2d3748',
        text: '#a3a3a3'
    },
    
    // Create candlestick chart
    createCandlestickChart: (ctx, data) => {
        const dates = data.map(d => d.date);
        const open = data.map(d => d.open);
        const high = data.map(d => d.high);
        const low = data.map(d => d.low);
        const close = data.map(d => d.close);
        
        return new Chart(ctx, {
            type: 'candlestick',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Price',
                    data: dates.map((date, i) => ({
                        t: date,
                        o: open[i],
                        h: high[i],
                        l: low[i],
                        c: close[i]
                    })),
                    color: {
                        up: charts.colors.bullish,
                        down: charts.colors.bearish,
                        unchanged: charts.colors.neutral
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1a1d21',
                        titleColor: '#ffffff',
                        bodyColor: '#a3a3a3',
                        borderColor: '#2d3748',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const data = context.raw;
                                return [
                                    `Open: $${data.o.toFixed(2)}`,
                                    `High: $${data.h.toFixed(2)}`,
                                    `Low: $${data.l.toFixed(2)}`,
                                    `Close: $${data.c.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        grid: {
                            color: charts.colors.grid
                        },
                        ticks: {
                            color: charts.colors.text
                        }
                    },
                    y: {
                        grid: {
                            color: charts.colors.grid
                        },
                        ticks: {
                            color: charts.colors.text,
                            callback: (value) => '$' + value.toFixed(2)
                        }
                    }
                }
            }
        });
    },
    
    // Create line chart for indicators
    createLineChart: (ctx, labels, datasets, title = '') => {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color || charts.colors.primary,
                    backgroundColor: ds.color ? ds.color + '33' : charts.colors.primary + '33',
                    borderWidth: 2,
                    fill: ds.fill || false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: charts.colors.text,
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1a1d21',
                        titleColor: '#ffffff',
                        bodyColor: '#a3a3a3',
                        borderColor: '#2d3748',
                        borderWidth: 1
                    },
                    title: {
                        display: title ? true : false,
                        text: title,
                        color: charts.colors.text,
                        font: {
                            size: 14
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: charts.colors.grid
                        },
                        ticks: {
                            color: charts.colors.text
                        }
                    },
                    y: {
                        grid: {
                            color: charts.colors.grid
                        },
                        ticks: {
                            color: charts.colors.text
                        }
                    }
                }
            }
        });
    },
    
    // Destroy chart
    destroy: (chart) => {
        if (chart) {
            chart.destroy();
        }
    }
};

// ===================================================================
// Stock Selection Functions
// ===================================================================

const stockSelection = {
    // Search for stocks
    search: (query) => {
        if (!query || query.length < 1) return [];
        
        const queryLower = query.toLowerCase();
        
        // Filter popular stocks
        const matches = CONFIG.POPULAR_STOCKS.filter(stock => 
            stock.symbol.toLowerCase().includes(queryLower) ||
            stock.name.toLowerCase().includes(queryLower)
        );
        
        // Also include exact match if not in popular list
        const exactMatch = {
            symbol: query.toUpperCase(),
            name: query.toUpperCase()
        };
        
        // Add exact match if not already present
        if (!matches.find(s => s.symbol === exactMatch.symbol)) {
            matches.unshift(exactMatch);
        }
        
        return matches.slice(0, 10);
    },
    
    // Add stock to selection
    add: (symbol, name = null) => {
        if (!symbol || symbol.trim() === '') {
            return false;
        }
        
        const cleanSymbol = symbol.toUpperCase().trim();
        const existingIndex = state.selectedStocks.findIndex(s => s.symbol === cleanSymbol);
        
        if (existingIndex === -1) {
            state.selectedStocks.push({
                symbol: cleanSymbol,
                name: name || cleanSymbol
            });
            
            stockSelection.render();
            ui.addActivity(`Added ${cleanSymbol}`);
            return true;
        }
        
        return false;
    },
    
    // Remove stock from selection
    remove: (symbol) => {
        state.selectedStocks = state.selectedStocks.filter(s => s.symbol !== symbol);
        stockSelection.render();
        ui.addActivity(`Removed ${symbol}`);
    },
    
    // Render selected stocks
    render: () => {
        if (state.selectedStocks.length === 0) {
            elements.selectedStocksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No stocks selected. Add stocks to begin analysis.</p>
                </div>
            `;
        } else {
            elements.selectedStocksList.innerHTML = state.selectedStocks.map(stock => `
                <div class="stock-item" data-symbol="${stock.symbol}">
                    <div class="stock-info">
                        <span class="stock-symbol">${stock.symbol}</span>
                        <span class="stock-name">${stock.name}</span>
                    </div>
                    <button class="remove-btn" onclick="stockSelection.remove('${stock.symbol}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
        
        ui.updateAnalyzeButton();
    },
    
    // Clear all stocks
    clear: () => {
        state.selectedStocks = [];
        stockSelection.render();
    }
};

// ===================================================================
// UI Functions
// ===================================================================

const ui = {
    // Initialize UI
    init: () => {
        // Theme
        ui.initTheme();
        
        // Stock search
        ui.initStockSearch();
        
        // Period selection
        ui.initPeriodSelection();
        
        // Analysis button
        ui.initAnalysis();
        
        // Modals
        ui.initModals();
        
        // Export buttons
        ui.initExport();
        
        // Settings
        ui.initSettings();
        
        // Initial render
        stockSelection.render();
    },
    
    // Initialize theme
    initTheme: () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        elements.themeToggle.innerHTML = savedTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            elements.themeToggle.innerHTML = newTheme === 'dark' ? 
                '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            
            ui.addActivity(`Switched to ${newTheme} theme`);
        });
    },
    
    // Initialize stock search
    initStockSearch: () => {
        const debouncedSearch = utils.debounce((query) => {
            const suggestions = stockSelection.search(query);
            ui.renderSuggestions(suggestions);
        }, 300);
        
        elements.stockSearch.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        elements.stockSearch.addEventListener('focus', () => {
            const query = elements.stockSearch.value;
            if (query.length > 0) {
                const suggestions = stockSelection.search(query);
                ui.renderSuggestions(suggestions);
            }
        });
        
        elements.stockSearch.addEventListener('blur', () => {
            setTimeout(() => {
                ui.hideSuggestions();
            }, 200);
        });
        
        elements.stockSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = elements.stockSearch.value.trim();
                if (query) {
                    stockSelection.add(query);
                    elements.stockSearch.value = '';
                    ui.hideSuggestions();
                }
            }
        });
    },
    
    // Render suggestions
    renderSuggestions: (suggestions) => {
        if (suggestions.length === 0) {
            ui.hideSuggestions();
            return;
        }
        
        elements.suggestionsList.innerHTML = suggestions.map(stock => `
            <div class="suggestion-item" onclick="ui.selectSuggestion('${stock.symbol}', '${stock.name}')">
                <span class="symbol">${stock.symbol}</span>
                <span class="name">${stock.name}</span>
            </div>
        `).join('');
        
        elements.suggestionsList.classList.add('show');
    },
    
    // Hide suggestions
    hideSuggestions: () => {
        elements.suggestionsList.classList.remove('show');
    },
    
    // Select suggestion
    selectSuggestion: (symbol, name) => {
        stockSelection.add(symbol, name);
        elements.stockSearch.value = '';
        ui.hideSuggestions();
        elements.stockSearch.focus();
    },
    
    // Initialize period selection
    initPeriodSelection: () => {
        elements.periodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all
                elements.periodButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked
                btn.classList.add('active');
                
                // Update state
                state.selectedPeriod = btn.dataset.period;
                
                ui.addActivity(`Selected period: ${btn.textContent}`);
            });
        });
    },
    
    // Initialize analysis
    initAnalysis: () => {
        elements.analyzeBtn.addEventListener('click', () => {
            ui.startAnalysis();
        });
        
        elements.cancelAnalysis.addEventListener('click', () => {
            ui.cancelAnalysis();
        });
    },
    
    // Update analyze button state
    updateAnalyzeButton: () => {
        if (state.selectedStocks.length === 0) {
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Run Analysis';
        } else {
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.innerHTML = `<i class="fas fa-play"></i> Run Analysis (${state.selectedStocks.length})`;
        }
    },
    
    // Start analysis
    startAnalysis: async () => {
        if (state.selectedStocks.length === 0) {
            ui.showNotification('Please select at least one stock', 'error');
            return;
        }
        
        if (state.analysisInProgress) {
            ui.showNotification('Analysis already in progress', 'warning');
            return;
        }
        
        state.analysisInProgress = true;
        
        // Show progress container
        elements.progressContainer.classList.add('show');
        elements.resultsContainer.classList.add('hidden');
        
        // Reset progress
        ui.resetProgress();
        
        try {
            // Get period config
            const periodConfig = CONFIG.PERIOD_MAP[state.selectedPeriod] || 
                CONFIG.PERIOD_MAP['7d'];
            
            // Update progress
            ui.updateProgress(0, 'Validating stocks...');
            
            // Get symbols
            const symbols = state.selectedStocks.map(s => s.symbol);
            
            // Update progress
            ui.updateProgress(10, 'Fetching data from Yahoo Finance...');
            
            // Call API
            const results = await api.analyze(symbols, {
                period: periodConfig.period,
                interval: periodConfig.interval,
                includeIndicators: true,
                includePatterns: true,
                includePredictions: true,
                includeRecommendations: true
            });
            
            // Store results
            state.analysisResults = Array.isArray(results) ? results : [results];
            
            // Update progress
            ui.updateProgress(100, 'Analysis complete!');
            
            // Mark all steps as completed
            ui.completeAllSteps();
            
            // Hide progress after delay
            setTimeout(() => {
                elements.progressContainer.classList.remove('show');
                elements.resultsContainer.classList.remove('hidden');
                
                // Display results
                ui.displayResults();
                
                state.analysisInProgress = false;
                
                ui.addActivity(`Analysis completed for ${symbols.length} stocks`);
            }, 500);
            
        } catch (error) {
            ui.updateProgress(100, 'Analysis failed: ' + error.message);
            ui.markStepFailed(1);
            
            setTimeout(() => {
                elements.progressContainer.classList.remove('show');
                elements.resultsContainer.classList.remove('hidden');
                state.analysisInProgress = false;
            }, 1000);
            
            ui.showNotification('Analysis failed: ' + error.message, 'error');
            ui.addActivity(`Analysis failed: ${error.message}`);
        }
    },
    
    // Cancel analysis
    cancelAnalysis: () => {
        if (state.analysisInProgress) {
            // Note: In a real implementation, we'd need to cancel the fetch request
            state.analysisInProgress = false;
            
            elements.progressContainer.classList.remove('show');
            elements.resultsContainer.classList.remove('hidden');
            
            ui.addActivity('Analysis cancelled');
            ui.showNotification('Analysis cancelled', 'warning');
        }
    },
    
    // Reset progress
    resetProgress: () => {
        elements.progressFill.style.width = '0%';
        elements.progressText.textContent = 'Initializing...';
        
        const steps = elements.progressSteps.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed', 'failed');
            if (index === 0) {
                step.classList.add('active');
            }
        });
    },
    
    // Update progress
    updateProgress: (percent, text) => {
        elements.progressFill.style.width = percent + '%';
        elements.progressText.textContent = text;
        
        // Update step based on percent
        const stepIndex = Math.floor(percent / (100 / CONFIG.ANALYSIS_STEPS.length));
        ui.activateStep(stepIndex);
    },
    
    // Activate step
    activateStep: (index) => {
        const steps = elements.progressSteps.querySelectorAll('.step');
        
        steps.forEach((step, i) => {
            step.classList.remove('active', 'completed');
            
            if (i < index) {
                step.classList.add('completed');
            } else if (i === index) {
                step.classList.add('active');
            }
        });
    },
    
    // Complete all steps
    completeAllSteps: () => {
        const steps = elements.progressSteps.querySelectorAll('.step');
        steps.forEach(step => {
            step.classList.remove('active', 'failed');
            step.classList.add('completed');
        });
    },
    
    // Mark step as failed
    markStepFailed: (index) => {
        const steps = elements.progressSteps.querySelectorAll('.step');
        if (steps[index]) {
            steps[index].classList.remove('active', 'completed');
            steps[index].classList.add('failed');
        }
    },
    
    // Display results
    displayResults: () => {
        if (!state.analysisResults || state.analysisResults.length === 0) {
            elements.summaryCards.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-chart-line"></i>
                    <h3>No analysis results yet</h3>
                    <p>Select stocks and click "Run Analysis" to begin</p>
                </div>
            `;
            elements.stockResults.innerHTML = '';
            return;
        }
        
        // Update quick stats
        ui.updateQuickStats();
        
        // Display summary cards
        ui.displaySummaryCards();
        
        // Display individual stock results
        ui.displayStockResults();
    },
    
    // Update quick stats
    updateQuickStats: () => {
        let bullish = 0, bearish = 0, neutral = 0;
        let totalConfidence = 0;
        
        state.analysisResults.forEach(result => {
            const signal = (result.overallSignal || '').toLowerCase();
            const confidence = result.confidence || 0;
            
            if (signal.includes('bullish')) bullish++;
            else if (signal.includes('bearish')) bearish++;
            else neutral++;
            
            totalConfidence += confidence;
        });
        
        const avgConfidence = state.analysisResults.length > 0 ?
            Math.round(totalConfidence / state.analysisResults.length) : 0;
        
        elements.bullishCount.textContent = bullish;
        elements.bearishCount.textContent = bearish;
        elements.neutralCount.textContent = neutral;
        elements.avgConfidence.textContent = avgConfidence + '%';
    },
    
    // Display summary cards
    displaySummaryCards: () => {
        const totalStocks = state.analysisResults.length;
        const avgPrice = state.analysisResults.reduce((sum, r) => sum + (r.currentPrice || 0), 0) / totalStocks;
        const avgPrediction = state.analysisResults.reduce((sum, r) => sum + (r.prediction || 0), 0) / totalStocks;
        
        const bullish = state.analysisResults.filter(r => 
            (r.overallSignal || '').toLowerCase().includes('bullish')
        ).length;
        const bearish = state.analysisResults.filter(r => 
            (r.overallSignal || '').toLowerCase().includes('bearish')
        ).length;
        
        elements.summaryCards.innerHTML = `
            <div class="summary-card">
                <div class="summary-card-header">
                    <span class="summary-card-title">Total Stocks</span>
                    <div class="summary-card-icon"><i class="fas fa-chart-pie"></i></div>
                </div>
                <div class="summary-card-value">${totalStocks}</div>
                <div class="summary-card-subtitle">Analyzed</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-header">
                    <span class="summary-card-title">Avg Price</span>
                    <div class="summary-card-icon"><i class="fas fa-dollar-sign"></i></div>
                </div>
                <div class="summary-card-value">${utils.formatPrice(avgPrice)}</div>
                <div class="summary-card-subtitle">Current average</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-header">
                    <span class="summary-card-title">Avg Prediction</span>
                    <div class="summary-card-icon"><i class="fas fa-crystal-ball"></i></div>
                </div>
                <div class="summary-card-value">${utils.formatPrice(avgPrediction)}</div>
                <div class="summary-card-subtitle">Predicted price</div>
            </div>
            <div class="summary-card">
                <div class="summary-card-header">
                    <span class="summary-card-title">Sentiment</span>
                    <div class="summary-card-icon"><i class="fas fa-balance-scale"></i></div>
                </div>
                <div class="summary-card-value">
                    <span class="badge bullish">${bullish}</span>
                    <span class="badge bearish">${bearish}</span>
                    <span class="badge neutral">${totalStocks - bullish - bearish}</span>
                </div>
                <div class="summary-card-subtitle">Bullish / Bearish / Neutral</div>
            </div>
        `;
    },
    
    // Display individual stock results
    displayStockResults: () => {
        elements.stockResults.innerHTML = state.analysisResults.map((result, index) => {
            const signal = result.overallSignal || 'neutral';
            const signalClass = utils.getSignalClass(signal);
            const symbol = result.symbol || 'N/A';
            const price = result.currentPrice || 0;
            const buyTarget = result.buyTarget || 0;
            const sellTarget = result.sellTarget || 0;
            const stopLoss = result.stopLoss || 0;
            const takeProfit = result.takeProfit || 0;
            const confidence = result.confidence || 0;
            
            return `
                <div class="stock-result-card slide-up" style="animation-delay: ${index * 0.1}s">
                    <div class="stock-result-header" onclick="ui.toggleStockResult(${index})">
                        <div class="stock-result-info">
                            <span class="stock-result-symbol">${symbol}</span>
                            <span class="stock-result-price">${utils.formatPrice(price)}</span>
                        </div>
                        <div class="stock-result-signal ${signalClass}">
                            <i class="fas fa-${signalClass === 'bullish' ? 'arrow-up' : signalClass === 'bearish' ? 'arrow-down' : 'minus'}"></i>
                            ${utils.capitalize(signal)} (${confidence}%)
                        </div>
                        <i class="fas fa-chevron-down stock-result-toggle"></i>
                    </div>
                    <div class="stock-result-body" id="stockResultBody-${index}">
                        <div class="stock-result-grid">
                            <!-- Trade Recommendations -->
                            <div class="stock-result-section">
                                <h4><i class="fas fa-target"></i> Trade Recommendations</h4>
                                <div class="indicator-list">
                                    <div class="indicator-item">
                                        <span class="indicator-label">Buy Target</span>
                                        <span class="indicator-value">${utils.formatPrice(buyTarget)}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Sell Target</span>
                                        <span class="indicator-value">${utils.formatPrice(sellTarget)}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Stop Loss</span>
                                        <span class="indicator-value">${utils.formatPrice(stopLoss)}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Take Profit</span>
                                        <span class="indicator-value">${utils.formatPrice(takeProfit)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Technical Indicators -->
                            ${state.settings.showIndicators ? `
                            <div class="stock-result-section">
                                <h4><i class="fas fa-calculator"></i> Technical Indicators</h4>
                                <div class="indicator-list">
                                    ${ui.renderIndicators(result.technical?.indicators || {})}
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Pattern Analysis -->
                            ${state.settings.showPatterns ? `
                            <div class="stock-result-section">
                                <h4><i class="fas fa-chart-candlestick"></i> Pattern Analysis</h4>
                                <div class="indicator-list">
                                    <div class="indicator-item">
                                        <span class="indicator-label">Candle Bullish</span>
                                        <span class="indicator-value">${result.patterns?.candle?.bullish || 0}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Candle Bearish</span>
                                        <span class="indicator-value">${result.patterns?.candle?.bearish || 0}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Candle Neutral</span>
                                        <span class="indicator-value">${result.patterns?.candle?.neutral || 0}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Chart Bullish</span>
                                        <span class="indicator-value">${result.patterns?.chart?.bullish || 0}</span>
                                    </div>
                                    <div class="indicator-item">
                                        <span class="indicator-label">Chart Bearish</span>
                                        <span class="indicator-value">${result.patterns?.chart?.bearish || 0}</span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Prediction -->
                            ${state.settings.showPredictions ? `
                            <div class="stock-result-section">
                                <h4><i class="fas fa-crystal-ball"></i> Prediction</h4>
                                <div class="indicator-list">
                                    <div class="indicator-item">
                                        <span class="indicator-label">Predicted Price</span>
                                        <span class="indicator-value">${utils.formatPrice(result.prediction || 0)}</span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        <!-- User-Friendly Interpretations -->
                        ${state.settings.showInterpretations ? `
                        <div class="interpretation-section">
                            <h4><i class="fas fa-lightbulb"></i> Analysis Interpretations</h4>
                            ${ui.renderInterpretations(result.interpretations || {})}
                        </div>
                        ` : ''}
                        
                        <!-- Charts Section -->
                        <div class="chart-container">
                            <h4><i class="fas fa-chart-line"></i> Price History</h4>
                            <div class="chart-wrapper">
                                <canvas id="chart-${index}"></canvas>
                            </div>
                        </div>
                        
                        <button class="btn btn-secondary" onclick="ui.showStockDetail(${index})" style="margin-top: 1rem;">
                            <i class="fas fa-expand"></i> View Full Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Load charts
        setTimeout(() => {
            ui.loadCharts();
        }, 100);
    },
    
    // Render indicators
    renderIndicators: (indicators) => {
        const indicatorEntries = Object.entries(indicators);
        
        if (indicatorEntries.length === 0) {
            return '<div class="indicator-item"><span class="indicator-label">No indicators</span></div>';
        }
        
        return indicatorEntries.map(([key, value]) => {
            if (key === 'stochastic' || key === 'bollingerBands') {
                // Handle nested objects
                return Object.entries(value).map(([subKey, subValue]) => `
                    <div class="indicator-item">
                        <span class="indicator-label">${utils.capitalize(key)} ${subKey}</span>
                        <span class="indicator-value">${typeof subValue === 'number' ? subValue.toFixed(2) : subValue}</span>
                    </div>
                `).join('');
            } else if (typeof value === 'object' && value !== null) {
                // Skip complex objects
                return '';
            } else if (typeof value === 'number') {
                return `
                    <div class="indicator-item">
                        <span class="indicator-label">${utils.capitalize(key)}</span>
                        <span class="indicator-value">${value.toFixed(2)}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="indicator-item">
                        <span class="indicator-label">${utils.capitalize(key)}</span>
                        <span class="indicator-value">${value || 'N/A'}</span>
                    </div>
                `;
            }
        }).join('');
    },
    
    // Render interpretations
    renderInterpretations: (interpretations) => {
        const entries = Object.entries(interpretations);
        
        if (entries.length === 0) {
            return '<p style="color: var(--text-muted);">No interpretations available</p>';
        }
        
        return entries.map(([key, value]) => {
            if (typeof value === 'object') {
                // Handle nested interpretations (like technical)
                return Object.entries(value).map(([subKey, subValue]) => `
                    <div class="interpretation-item">
                        <span class="interpretation-label">${utils.capitalize(subKey)}</span>
                        <span class="interpretation-text">${subValue}</span>
                    </div>
                `).join('');
            } else {
                return `
                    <div class="interpretation-item">
                        <span class="interpretation-label">${utils.capitalize(key)}</span>
                        <span class="interpretation-text">${value}</span>
                    </div>
                `;
            }
        }).join('');
    },
    
    // Load charts
    loadCharts: async () => {
        for (let i = 0; i < state.analysisResults.length; i++) {
            const result = state.analysisResults[i];
            const canvas = document.getElementById(`chart-${i}`);
            
            if (!canvas) continue;
            
            try {
                // Fetch historical data for this stock
                const periodConfig = CONFIG.PERIOD_MAP[state.selectedPeriod] || 
                    CONFIG.PERIOD_MAP['7d'];
                
                const historicalData = await api.getHistorical(result.symbol, {
                    period: periodConfig.period,
                    interval: periodConfig.interval
                });
                
                if (historicalData && historicalData.length > 0) {
                    // Prepare data for chart
                    const chartData = historicalData.map(d => ({
                        date: new Date(d.timestamp * 1000),
                        open: d.open,
                        high: d.high,
                        low: d.low,
                        close: d.close
                    }));
                    
                    // Create chart
                    charts[`chart-${i}`] = charts.createCandlestickChart(
                        canvas.getContext('2d'),
                        chartData
                    );
                }
            } catch (error) {
                console.error('Error loading chart:', error);
            }
        }
    },
    
    // Toggle stock result
    toggleStockResult: (index) => {
        const body = document.getElementById(`stockResultBody-${index}`);
        const toggle = body.previousElementSibling.querySelector('.stock-result-toggle');
        
        body.classList.toggle('expanded');
        toggle.classList.toggle('expanded');
    },
    
    // Show stock detail modal
    showStockDetail: (index) => {
        const result = state.analysisResults[index];
        
        elements.detailSymbol.textContent = result.symbol || 'N/A';
        
        // Build detailed HTML
        let html = `
            <div class="stock-detail-grid">
                <!-- Overview Card -->
                <div class="detail-card">
                    <h3><i class="fas fa-info-circle"></i> Overview</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Symbol</span>
                            <span class="detail-value">${result.symbol || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Company</span>
                            <span class="detail-value">${result.company || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Current Price</span>
                            <span class="detail-value">${utils.formatPrice(result.currentPrice || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Signal</span>
                            <span class="detail-value badge ${utils.getSignalClass(result.overallSignal || 'neutral')}">
                                ${utils.capitalize(result.overallSignal || 'neutral')}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Confidence</span>
                            <span class="detail-value">${result.confidence || 0}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- Trade Recommendations Card -->
                <div class="detail-card">
                    <h3><i class="fas fa-target"></i> Trade Recommendations</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Buy Target</span>
                            <span class="detail-value">${utils.formatPrice(result.buyTarget || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Sell Target</span>
                            <span class="detail-value">${utils.formatPrice(result.sellTarget || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Stop Loss</span>
                            <span class="detail-value">${utils.formatPrice(result.stopLoss || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Take Profit</span>
                            <span class="detail-value">${utils.formatPrice(result.takeProfit || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prediction</span>
                            <span class="detail-value">${utils.formatPrice(result.prediction || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Technical Indicators Card -->
                <div class="detail-card">
                    <h3><i class="fas fa-calculator"></i> Technical Indicators</h3>
                    <div class="detail-grid">
                        ${Object.entries(result.technical?.indicators || {}).map(([key, value]) => {
                            if (key === 'stochastic' || key === 'bollingerBands') {
                                return Object.entries(value).map(([subKey, subValue]) => `
                                    <div class="detail-item">
                                        <span class="detail-label">${utils.capitalize(key)} ${subKey}</span>
                                        <span class="detail-value">${typeof subValue === 'number' ? subValue.toFixed(2) : subValue}</span>
                                    </div>
                                `).join('');
                            } else if (typeof value === 'number') {
                                return `
                                    <div class="detail-item">
                                        <span class="detail-label">${utils.capitalize(key)}</span>
                                        <span class="detail-value">${value.toFixed(2)}</span>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="detail-item">
                                        <span class="detail-label">${utils.capitalize(key)}</span>
                                        <span class="detail-value">${value || 'N/A'}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
                
                <!-- Pattern Analysis Card -->
                <div class="detail-card">
                    <h3><i class="fas fa-chart-candlestick"></i> Pattern Analysis</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Candle Bullish</span>
                            <span class="detail-value">${result.patterns?.candle?.bullish || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Candle Bearish</span>
                            <span class="detail-value">${result.patterns?.candle?.bearish || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Candle Neutral</span>
                            <span class="detail-value">${result.patterns?.candle?.neutral || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Chart Bullish</span>
                            <span class="detail-value">${result.patterns?.chart?.bullish || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Chart Bearish</span>
                            <span class="detail-value">${result.patterns?.chart?.bearish || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Interpretations Section -->
            <div class="detail-section">
                <h3><i class="fas fa-lightbulb"></i> User-Friendly Interpretations</h3>
                <div class="interpretations-grid">
                    ${Object.entries(result.interpretations || {}).map(([key, value]) => {
                        if (typeof value === 'object') {
                            return Object.entries(value).map(([subKey, subValue]) => `
                                <div class="interpretation-card">
                                    <div class="interpretation-card-header">
                                        <span class="interpretation-card-title">${utils.capitalize(subKey)}</span>
                                    </div>
                                    <div class="interpretation-card-text">${subValue}</div>
                                </div>
                            `).join('');
                        } else {
                            return `
                                <div class="interpretation-card">
                                    <div class="interpretation-card-header">
                                        <span class="interpretation-card-title">${utils.capitalize(key)}</span>
                                    </div>
                                    <div class="interpretation-card-text">${value}</div>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
        
        elements.stockDetailBody.innerHTML = html;
        elements.stockDetailModal.classList.add('show');
    },
    
    // Initialize modals
    initModals: () => {
        // Close modal on click outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('show');
            });
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('show');
                });
            }
        });
    },
    
    // Initialize settings
    initSettings: () => {
        // Load saved settings
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            try {
                state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        
        // Update checkboxes
        elements.showIndicators.checked = state.settings.showIndicators;
        elements.showPatterns.checked = state.settings.showPatterns;
        elements.showPredictions.checked = state.settings.showPredictions;
        elements.showInterpretations.checked = state.settings.showInterpretations;
        
        // Save settings
        elements.saveSettings.addEventListener('click', () => {
            state.settings = {
                showIndicators: elements.showIndicators.checked,
                showPatterns: elements.showPatterns.checked,
                showPredictions: elements.showPredictions.checked,
                showInterpretations: elements.showInterpretations.checked
            };
            
            localStorage.setItem('settings', JSON.stringify(state.settings));
            
            // Re-display results with new settings
            if (state.analysisResults) {
                ui.displayResults();
            }
            
            // Close modal
            elements.settingsModal.classList.remove('show');
            
            ui.addActivity('Settings updated');
            ui.showNotification('Settings saved', 'success');
        });
    },
    
    // Initialize export
    initExport: () => {
        elements.exportJson.addEventListener('click', () => {
            if (!state.analysisResults) {
                ui.showNotification('No results to export', 'warning');
                return;
            }
            
            const data = JSON.stringify(state.analysisResults, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-analysis-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.addActivity('Exported JSON');
            ui.showNotification('JSON exported successfully', 'success');
        });
        
        elements.exportPdf.addEventListener('click', () => {
            ui.showNotification('PDF export coming soon!', 'info');
        });
    },
    
    // Add activity item
    addActivity: (message) => {
        const item = document.createElement('div');
        item.className = 'activity-item fade-in';
        item.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
        
        elements.activityList.insertBefore(item, elements.activityList.firstChild);
        
        // Limit to 10 items
        if (elements.activityList.children.length > 10) {
            elements.activityList.removeChild(elements.activityList.lastChild);
        }
    },
    
    // Show notification
    showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Style notification (could be moved to CSS)
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: var(--spacing-md) var(--spacing-lg);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            z-index: 10000;
            box-shadow: var(--shadow-lg);
        `;
        
        // Add type-specific styling
        if (type === 'success') {
            notification.style.borderLeft = '4px solid var(--text-success)';
        } else if (type === 'error') {
            notification.style.borderLeft = '4px solid var(--text-danger)';
        } else if (type === 'warning') {
            notification.style.borderLeft = '4px solid var(--text-warning)';
        } else {
            notification.style.borderLeft = '4px solid var(--primary)';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
};

// ===================================================================
// Initialize Application
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    ui.init();
});

// Make functions globally available for onclick handlers
window.stockSelection = stockSelection;
window.ui = ui;
window.utils = utils;
window.CONFIG = CONFIG;
