# Depthquote - Stock Analysis Platform

A comprehensive Node.js application for analyzing stocks using technical indicators, candlestick patterns, and various prediction methods. Depthquote is designed to power a professional graphical frontend GUI with candle charts, historical data, and user-friendly interpretations.

## Features

### Technical Indicators
- **Trend Indicators**: SMA, EMA, WMA, MACD, ADX, Bollinger Bands, Ichimoku Cloud, Parabolic SAR, Supertrend, ATR
- **Momentum Indicators**: RSI, Stochastic Oscillator, Williams %R, CCI, ROC, Momentum, Awesome Oscillator, MFI, Chaikin Money Flow, Ultimate Oscillator
- **Volume Indicators**: OBV, VWAP, Chaikin Oscillator, Klinger Oscillator, Volume Price Trend, NVI, PVI, Volume Ratio, Ease of Movement, Force Index, Money Stream
- **Volatility Indicators**: ATR, Bollinger Bands %B, BB Width, Donchian Channels, Keltner Channels, Historical Volatility, Standard Deviation, Variance, Beta, Alpha, Sharpe Ratio, Sortino Ratio

### Candlestick Pattern Recognition
- **Bullish Patterns**: Hammer, Inverted Hammer, Bullish Engulfing, Piercing Line, Morning Star, Three White Soldiers, Bullish Harami, Tweezer Bottom, Three Inside Up, Rising Three Methods
- **Bearish Patterns**: Shooting Star, Hanging Man, Bearish Engulfing, Dark Cloud Cover, Evening Star, Three Black Crows, Bearish Harami, Tweezer Top, Three Inside Down, Falling Three Methods
- **Neutral Patterns**: Doji, Spinning Top, Long-Legged Doji, Dragonfly Doji, Gravestone Doji, High Wave, Marubozu

### Chart Pattern Recognition
- Head & Shoulders, Inverse Head & Shoulders, Double Top, Double Bottom, Ascending Triangle, Descending Triangle, Symmetrical Triangle, Rising Wedge, Falling Wedge, Bullish Flag, Bearish Flag, Bullish Pennant, Bearish Pennant, Cup & Handle, Rounding Bottom, Rounding Top, and more

### Prediction Models
- **Statistical**: Linear Regression, Polynomial Regression, Exponential Regression, ARIMA, SARIMA, Holt-Winters, Prophet
- **Machine Learning**: LSTM, Random Forest, Gradient Boosting, SVM, Ensemble (TensorFlow.js optional)
- **Technical**: Moving Average Crossover, Bollinger Band Width, RSI Divergence, MACD Histogram, Support/Resistance, Volume-Based

### User-Friendly Features
- Human-readable interpretations for all analysis components
- Professional dark theme (Coinbase Pro-inspired)
- Interactive candlestick charts
- Progress tracking during analysis
- Export to JSON

## Installation

```bash
# Clone the repository
git clone https://github.com/Kenesti/Depthquote.git
cd Depthquote

# Install dependencies
npm install

# Start the application
node index.js

# Or start with frontend serving
node index.js --serve-frontend
```

## Usage

### Backend API
The backend provides a RESTful API with the following endpoints:

- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze stocks
- `GET /api/historical/:symbol` - Get historical data
- `GET /api/indicators/:symbol` - Get technical indicators
- `GET /api/patterns/:symbol` - Get pattern analysis
- `GET /api/predictions/:symbol` - Get price predictions

### Frontend
Open `frontend/index.html` in a browser or start with `--serve-frontend` flag.

## Project Structure

```
Depthquote/
├── index.js                          # Main entry point
├── package.json                      # Dependencies
├── README.md                         # Documentation
├── config/
│   └── constants.js                  # Configuration
├── lib/
│   ├── analysis/                     # Analysis engine
│   ├── data/                        # Data fetching & processing
│   ├── indicators/                  # Technical indicators
│   ├── patterns/                    # Pattern recognition
│   └── prediction/                  # Prediction models
├── services/
│   └── apiService.js                 # REST API service
├── utils/                           # Utilities
└── frontend/                        # Frontend application
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

## License

MIT