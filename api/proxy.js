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

    // Define Binance API endpoints (no proxy)
    const binanceEndpoints = [
        'https://api.binance.com/api/v3/klines', // Original endpoint (worked locally)
        'https://api2.binance.com/api/v3/klines', // Alternative endpoint
    ];

    let errorMessage = null;
    let data = null;

    // Try each Binance endpoint
    for (const endpoint of binanceEndpoints) {
        console.log(`[Direct] Trying: ${endpoint}?symbol=${symbol}&interval=${interval}&limit=${limit}`);

        try {
            const response = await axios.get(endpoint, {
                params: {
                    symbol: symbol || 'BTCUSDT',
                    interval: interval || '1m', // Match local success
                    limit: parseInt(limit) || 100,
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Mimic browser
                    'X-MBX-APIKEY': process.env.BINANCE_API_KEY || '', // Add API Key if available
                },
                timeout: 5000, // 5-second timeout
            });

            console.log(`[Direct] Success with ${endpoint}, Status: ${response.status}`);
            data = response.data;
            break;
        } catch (error) {
            errorMessage = `[Direct] Error with ${endpoint}: ${error.response ? error.response.status : error.message}`;
            console.error(errorMessage);
            if (error.response && error.response.status === 451) {
                console.warn('Geographic restriction detected, trying next endpoint...');
            } else if (error.response) {
                console.error('Error Data:', error.response.data);
            }
            continue; // Try next endpoint
        }
    }

    // If no data retrieved, return the last error
    if (!data) {
        console.error('[Direct] All attempts failed:', errorMessage);
        return res.status(errorMessage.includes('451') ? 451 : 500).json({
            message: 'Failed to fetch from Binance API',
            binanceError: errorMessage.includes('451') ? 'Service unavailable due to geographic restrictions' : 'Unknown error',
            suggestion: errorMessage.includes('451') ? 'Contact Binance support to resolve geographic restrictions or use a VPN.' : 'Check network or API key.',
        });
    }

    res.status(200).json(data);
};
