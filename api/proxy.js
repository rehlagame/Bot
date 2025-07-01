// File: /api/proxy.js (Corrected with alternative Binance endpoint)

const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { symbol, interval, limit } = req.query;
    
    // --- THIS IS THE KEY CHANGE ---
    // Use an alternative, non-restricted Binance API endpoint.
    const binanceApiUrl = `https://api1.binance.com/api/v3/klines`;
    // If api1 doesn't work, try api2.binance.com, then api3.binance.com

    try {
        const response = await axios.get(binanceApiUrl, {
            params: {
                symbol: symbol || 'BTCUSDT',
                interval: interval || '1h',
                limit: parseInt(limit) || 100,
            },
        });
        
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching from Binance API:', error.response ? error.response.data : error.message);
        
        res.status(error.response?.status || 500).json({
            message: 'Error fetching from Binance API',
            binanceError: error.response?.data || 'Unknown error',
        });
    }
};
