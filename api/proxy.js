// File: /api/proxy.js (Corrected with module.exports)

const axios = require('axios');

// Vercel يتوقع دالة handler يتم تصديرها باستخدام module.exports
// هذا هو التعديل الرئيسي
module.exports = async (req, res) => {
    // تمكين CORS للسماح بالطلبات من أي مكان (مهم لـ Vercel)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Vercel يتعامل مع طلبات OPTIONS تلقائياً، لكن هذا جيد كإجراء احترازي
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { symbol, interval, limit } = req.query;
    const binanceApiUrl = `https://api.binance.com/api/v3/klines`;

    try {
        const response = await axios.get(binanceApiUrl, {
            params: {
                symbol: symbol || 'BTCUSDT',
                interval: interval || '1h',
                limit: parseInt(limit) || 100,
            },
        });
        
        // إرسال البيانات المستلمة من Binance كرد
        res.status(200).json(response.data);

    } catch (error) {
        // طباعة الخطأ في سجلات Vercel لتسهيل التصحيح
        console.error('Error fetching from Binance API:', error.response ? error.response.data : error.message);
        
        res.status(error.response?.status || 500).json({
            message: 'Error fetching from Binance API',
            binanceError: error.response?.data || 'Unknown error',
        });
    }
};
