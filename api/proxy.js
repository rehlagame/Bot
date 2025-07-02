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

    // Use a proxy to bypass geographic restrictions (e.g., a free proxy service or a paid VPN API)
    const proxyUrl = 'https://your-proxy-service.com'; // Replace with a valid proxy URL (e.g., https://api.proxyscrape.com)
    const binanceApiUrl = `${proxyUrl}/https://api2.binance.com/api/v3/klines`; // Proxy + Binance endpoint

    // Optional: Add your Binance API Key if available
    const apiKey = process.env.BINANCE_API_KEY || null; // Retrieve from environment variables

    try {
        const response = await axios.get(binanceApiUrl, {
            params: {
                symbol: symbol || 'BTCUSDT',
                interval: interval || '1h',
                limit: parseInt(limit) || 100,
            },
            headers: apiKey ? { 'X-MBX-APIKEY': apiKey } : {},
            proxy: false, // Disable Node.js proxy if using an external proxy URL
        });

        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching from Binance API:', error.response ? error.response.data : error.message);

        // Enhanced error response with geographic restriction hint
        res.status(error.response?.status || 500).json({
            message: 'Error fetching from Binance API',
            binanceError: error.response?.data || 'Unknown error',
            suggestion: error.response?.status === 451 ? 'Service unavailable due to geographic restrictions. Consider using a proxy or contacting Binance support.' : null,
        });
    }
};
