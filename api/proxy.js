const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { symbol, interval, limit } = req.query;
    
    // قائمة بـ proxies مختلفة
    const proxyEndpoints = [
        // 1. Proxy 1 - AllOrigins
        async () => {
            const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol || 'BTCUSDT'}&interval=${interval || '5m'}&limit=${limit || 100}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(binanceUrl)}`;
            
            const response = await axios.get(proxyUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            return response.data;
        },
        
        // 2. Proxy 2 - jsonp.afeld.me
        async () => {
            const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol || 'BTCUSDT'}&interval=${interval || '5m'}&limit=${limit || 100}`;
            const proxyUrl = `https://jsonp.afeld.me/?url=${encodeURIComponent(binanceUrl)}`;
            
            const response = await axios.get(proxyUrl, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            return response.data;
        },
        
        // 3. Proxy 3 - corsproxy.io
        async () => {
            const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol || 'BTCUSDT'}&interval=${interval || '5m'}&limit=${limit || 100}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(binanceUrl)}`;
            
            const response = await axios.get(proxyUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            return response.data;
        },
        
        // 4. محاولة مباشرة عبر Binance Cloud
        async () => {
            const response = await axios.get('https://data.binance.com/api/v3/klines', {
                params: {
                    symbol: symbol || 'BTCUSDT',
                    interval: interval || '5m',
                    limit: parseInt(limit) || 100
                },
                timeout: 8000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            return response.data;
        },
        
        // 5. استخدام CoinGecko API كبديل
        async () => {
            console.log('محاولة استخدام CoinGecko API...');
            
            // تحويل الرمز من Binance إلى CoinGecko
            const coinMap = {
                'BTCUSDT': 'bitcoin',
                'ETHUSDT': 'ethereum',
                'BNBUSDT': 'binancecoin',
                'SOLUSDT': 'solana',
                'XRPUSDT': 'ripple',
                'DOGEUSDT': 'dogecoin',
                'ADAUSDT': 'cardano',
                'AVAXUSDT': 'avalanche-2',
                'SHIBUSDT': 'shiba-inu',
                'DOTUSDT': 'polkadot'
            };
            
            const coinId = coinMap[symbol] || 'bitcoin';
            const days = interval === '5m' ? '1' : interval === '1h' ? '7' : '30';
            
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`, {
                params: {
                    vs_currency: 'usd',
                    days: days
                },
                timeout: 10000
            });
            
            // تحويل بيانات CoinGecko إلى تنسيق Binance
            const data = response.data.map(candle => [
                candle[0], // timestamp
                candle[1].toString(), // open
                candle[2].toString(), // high
                candle[3].toString(), // low
                candle[4].toString(), // close
                "1000", // volume تقريبي
                candle[0] + 300000, // close time
                "1000000", // quote volume
                100, // trades
                "500", // taker buy base
                "500000", // taker buy quote
                "0"
            ]);
            
            return data.slice(-parseInt(limit || 100));
        }
    ];

    // تجربة كل proxy
    for (let i = 0; i < proxyEndpoints.length; i++) {
        try {
            console.log(`جرب Proxy ${i + 1}...`);
            const data = await proxyEndpoints[i]();
            
            // التحقق من صحة البيانات
            if (Array.isArray(data) && data.length > 0) {
                console.log(`نجح Proxy ${i + 1}`);
                return res.status(200).json(data);
            }
        } catch (error) {
            console.error(`فشل Proxy ${i + 1}:`, error.message);
            continue;
        }
    }
    
    // إذا فشلت جميع المحاولات، أعد رسالة خطأ واضحة
    console.error('فشلت جميع محاولات الحصول على البيانات الحقيقية');
    
    return res.status(503).json({
        error: 'Unable to fetch real-time data',
        message: 'جميع مصادر البيانات غير متاحة حالياً. يرجى المحاولة لاحقاً أو استخدام VPN.',
        suggestion: 'يمكنك استخدام خدمة VPN أو الاتصال بدعم Binance لحل مشكلة الحظر الجغرافي.'
    });
};
