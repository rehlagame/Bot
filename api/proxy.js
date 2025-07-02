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

    // Define multiple proxy options and fallback to the original endpoint if proxy fails
    const proxyOptions = [
        process.env.PROXY_URL_1 || 'https://api.proxyscrape.com', // Primary proxy
        process.env.PROXY_URL_2 || 'https://proxy.scrapeops.io/free', // Secondary proxy (free tier)
    ];
    const binanceEndpoints = [
        'https://api.binance.com/api/v3/klines', // Original endpoint (worked locally)
        'https://api2.binance.com/api/v3/klines', // Alternative endpoint
    ];

    let errorMessage = null;
    let data = null;

    // Try each proxy and endpoint combination
    for (const proxy of proxyOptions) {
        for (const endpoint of binanceEndpoints) {
            const fullUrl = `${proxy}/${endpoint}`;
            console.log(`[Proxy] Trying: ${fullUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`);

            try {
                const response = await axios.get(fullUrl, {
                    params: {
                        symbol: symbol || 'BTCUSDT',
                        interval: interval || '1m',
                        limit: parseInt(limit) || 100,
                    },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Mimic browser
                    },
                    timeout: 5000, // 5-second timeout
                });

                console.log(`[Proxy] Success with ${fullUrl}, Status: ${response.status}`);
                data = response.data;
                break;
            } catch (error) {
                errorMessage = `[Proxy] Error with ${fullUrl}: ${error.response ? error.response.status : error.message}`;
                console.error(errorMessage);
                if (error.response && error.response.status === 451) {
                    console.warn('Geographic restriction detected, trying next option...');
                }
                continue; // Try next combination
            }
        }
        if (data) break; // Exit if data is retrieved
    }

    // If no data retrieved, return the last error
    if (!data) {
        console.error('[Proxy] All attempts failed:', errorMessage);
        return res.status(451).json({
            message: 'Failed to fetch from Binance API',
            binanceError: 'Service unavailable due to geographic restrictions or proxy failure',
            suggestion: 'Check PROXY_URL_1 and PROXY_URL_2 environment variables or contact Binance support.',
        });
    }

    res.status(200).json(data);
};
