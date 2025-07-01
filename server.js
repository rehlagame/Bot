// --- START OF FILE server.js (Binance Proxy Server) ---

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // استخدم منفذًا مختلفًا عن تطبيق الواجهة الأمامية إذا كنت تشغلهما معًا محليًا

// إعدادات CORS
// في بيئة الإنتاج، يجب تقييد هذا إلى نطاق الواجهة الأمامية الخاص بك فقط
// مثال: app.use(cors({ origin: 'http://localhost:63342' })); أو app.use(cors({ origin: 'https://your-frontend-domain.com' }));
app.use(cors()); // حاليًا يسمح بجميع الطلبات للتسهيل أثناء التطوير المحلي

// Middleware لتحليل JSON (إذا كنت سترسل بيانات JSON في الطلب إلى البروكسي لاحقًا)
app.use(express.json());

// Endpoint لجلب بيانات Klines من Binance
app.get('/api/binance/klines', async (req, res) => {
    const symbol = req.query.symbol || 'BTCUSDT';
    const interval = req.query.interval || '1m'; // تغيير الافتراضي إلى '1m' للتأكد من وجود بيانات دائمًا
    const limit = req.query.limit || '100'; // تقليل الحد للتجربة الأولية

    const binanceApiUrl = `https://api.binance.com/api/v3/klines`;

    console.log(`[Proxy] Received request for: symbol=${symbol}, interval=${interval}, limit=${limit}`);
    console.log(`[Proxy] Fetching from Binance URL: ${binanceApiUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`);

    try {
        const response = await axios.get(binanceApiUrl, {
            params: {
                symbol: symbol,
                interval: interval,
                limit: parseInt(limit) // تأكد من أن الحد رقم
            }
        });

        console.log(`[Proxy] Binance API response status: ${response.status}`);
        // لا تطبع response.data بالكامل هنا إذا كانت كبيرة جدًا، إلا للتشخيص
        // console.log('[Proxy] Binance API response data (first 5):', response.data.slice(0, 5));

        res.json(response.data);

    } catch (error) {
        console.error('[Proxy] Error fetching from Binance API:');
        if (error.response) {
            // الطلب تم واستجاب الخادم برمز حالة خارج نطاق 2xx
            console.error('Error Data:', error.response.data);
            console.error('Error Status:', error.response.status);
            console.error('Error Headers:', error.response.headers);
            res.status(error.response.status).json({
                message: 'Error from Binance API',
                binanceError: error.response.data
            });
        } else if (error.request) {
            // الطلب تم ولكن لم يتم استلام أي استجابة
            console.error('Error Request:', error.request);
            res.status(504).json({ message: 'No response received from Binance API (Gateway Timeout)' });
        } else {
            // حدث خطأ ما أثناء إعداد الطلب أدى إلى إطلاق الخطأ
            console.error('Error Message:', error.message);
            res.status(500).json({ message: 'Error setting up request to Binance API', error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`[Proxy] Binance proxy server running on http://localhost:${PORT}`);
});

// --- END OF FILE server.js ---