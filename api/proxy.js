const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS for Serverless environment
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

    // Use a proxy to bypass geographic restrictions
    const proxyUrl = process.env.PROXY_URL || 'https://api.proxyscrape.com'; // Configurable via environment variable
    const binanceApiUrl = `${proxyUrl}/https://api.binance.com/api/v3/klines`; // Revert to original endpoint with proxy

    // Optional: Add Binance API Key from environment variables
    const apiKey = process.env.BINANCE_API_KEY || null;

    console.log(`[Proxy] Received request for: symbol=${symbol}, interval=${interval}, limit=${limit}`);
    console.log(`[Proxy] Fetching from Binance URL via proxy: ${binanceApiUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`);

    try {
        const response = await axios.get(binanceApiUrl, {
            params: {
                symbol: symbol || 'BTCUSDT',
                interval: interval || '1m', // Match local success with '1m' default
                limit: parseInt(limit) || 100,
            },
            headers: apiKey ? { 'X-MBX-APIKEY': apiKey } : {},
            proxy: false, // Disable Node.js proxy as we're using an external proxy URL
        });

        console.log(`[Proxy] Binance API response status: ${response.status}`);
        res.status(200).json(response.data);

    } catch (error) {
        console.error('[Proxy] Error fetching from Binance API:');
        if (error.response) {
            // Request made and server responded with a status outside 2xx
            console.error('Error Data:', error.response.data);
            console.error('Error Status:', error.response.status);
            console.error('Error Headers:', error.response.headers);
            res.status(error.response.status).json({
                message: 'Error from Binance API',
                binanceError: error.response.data,
                suggestion: error.response.status === 451 ? 'Service unavailable due to geographic restrictions. Use a different proxy or contact Binance support.' : null,
            });
        } else if (error.request) {
            // Request made but no response received
            console.error('Error Request:', error.request);
            res.status(504).json({ message: 'No response received from Binance API (Gateway Timeout)' });
        } else {
            // Error occurred while setting up the request
            console.error('Error Message:', error.message);
            res.status(500).json({ message: 'Error setting up request to Binance API', error: error.message });
        }
    }
};
