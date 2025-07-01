// --- DOM Element Initialization with null checks ---
const chartElement = document.getElementById('trading-chart');
const volumeChartElement = document.getElementById('volume-chart');
const priceElement = document.getElementById('current-price');
const trendElement = document.getElementById('trend');
const rsiElement = document.getElementById('rsi-value');
const fearGreedElement = document.getElementById('fear-greed-value');
const signalsLog = document.getElementById('signals-log');
const instructionsElement = document.getElementById('trading-instructions');
const timeframeButtons = document.querySelectorAll('.timeframe-btn');
const chartTitleElement = document.getElementById('chart-timeframe-title');
const emaFastInput = document.getElementById('emaFast');
const emaSlowInput = document.getElementById('emaSlow');
const rsiPeriodInput = document.getElementById('rsiPeriod');
const bbPeriodInput = document.getElementById('bbPeriod');
const bbStdDevInput = document.getElementById('bbStdDev');
const applySettingsBtn = document.getElementById('apply-settings-btn');
const capitalInput = document.getElementById('capital');
const uploadFileInput = document.getElementById('uploadFile');
const riskPercentageInput = document.getElementById('riskPercentage');

// --- START: New Coin Selector Elements ---
const coinSelectorElement = document.getElementById('coin-selector');
const chartCoinTitleElement = document.getElementById('chart-coin-title');
// --- END: New Coin Selector Elements ---


// --- Global State ---
let indicatorSettings = { emaFast: 9, emaSlow: 21, rsiPeriod: 14, bbPeriod: 20, bbStdDev: 2 };
let currentInterval = '5m'; // Default interval
let srLines = [];
let chart, candleSeries, emaFastSeries, emaSlowSeries, bbUpperSeries, bbMiddleSeries, bbLowerSeries;
let volumeChart, volumeSeries;
let tradesHistory = [];

// --- START: New Global State for Coins ---
let currentSymbol = 'BTCUSDT'; // Default symbol
const topCoins = [
    { symbol: 'BTCUSDT', name: 'Bitcoin' },
    { symbol: 'ETHUSDT', name: 'Ethereum' },
    { symbol: 'BNBUSDT', name: 'BNB' },
    { symbol: 'SOLUSDT', name: 'Solana' },
    { symbol: 'XRPUSDT', name: 'XRP' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin' },
    { symbol: 'ADAUSDT', name: 'Cardano' },
    { symbol: 'AVAXUSDT', name: 'Avalanche' },
    { symbol: 'SHIBUSDT', name: 'Shiba Inu' },
    { symbol: 'DOTUSDT', name: 'Polkadot' }
];
// --- END: New Global State for Coins ---

// --- File Data Variables ---
var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};

// ... (The rest of your existing functions: filledCell, loadFileData, initializeCharts, syncTimeRange, calculateEMA, etc. remain unchanged) ...
// ... (Your existing functions from here down to fetchDataAndAnalyze are okay) ...

function filledCell(cell) {
    return cell !== '' && cell != null && cell !== undefined;
}

function loadFileData(filename) {
    if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
        try {
            var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];
            var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            var filteredData = jsonData.filter(row => Array.isArray(row) && row.some(filledCell));
            var headerRowIndex = filteredData.findIndex((row, index, arr) =>
                Array.isArray(row) && row.filter(filledCell).length >= (arr[index + 1]?.filter(filledCell).length || 0)
            );
            if (headerRowIndex === -1 || headerRowIndex > 25 || headerRowIndex >= filteredData.length) {
                headerRowIndex = 0;
            }
            var dataSlice = filteredData.slice(headerRowIndex);
            if (dataSlice.length === 0) {
                console.warn("No data after slicing header for Excel file:", filename);
                return [];
            }
            var headers = dataSlice[0].map(h => String(h).trim().toLowerCase());
            var dataRows = dataSlice.slice(1);
            var chartData = dataRows.map(row => {
                if (!Array.isArray(row)) return null;
                let rowObject = {};
                headers.forEach((header, idx) => { rowObject[header] = row[idx]; });
                const time = parseInt(rowObject['time'] || (Date.now() / 1000));
                const open = parseFloat(rowObject['open']);
                const high = parseFloat(rowObject['high']);
                const low = parseFloat(rowObject['low']);
                const close = parseFloat(rowObject['close']);
                const volume = parseFloat(rowObject['volume']);
                if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
                    return null;
                }
                return { time, open, high, low, close, volume };
            }).filter(d => d !== null && d.time && d.open && d.high && d.low && d.close && d.volume !== undefined);
            if (chartData.length === 0) {
                console.warn("Excel file parsed but resulted in zero valid chart data points:", filename, "Headers found:", headers);
            }
            return chartData;
        } catch (e) {
            console.error("Error processing XLSX file:", filename, e);
            return [];
        }
    }
    return gk_fileData[filename] ? (typeof gk_fileData[filename] === 'string' ? JSON.parse(gk_fileData[filename]) : gk_fileData[filename]) : [];
}

// --- Chart Initialization ---
function initializeCharts() {
    if (!chartElement || !volumeChartElement) {
        console.error("Chart or Volume Chart DOM element not found!");
        return false;
    }
    const chartOptions = {
        width: chartElement.clientWidth, height: chartElement.clientHeight,
        layout: { backgroundColor: 'rgba(30, 30, 30, 0)', textColor: '#e0e0e0' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.1)' }, horzLines: { color: 'rgba(255, 255, 255, 0.1)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', rightOffset: 10, barSpacing: 6 },
        rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
    };
    chart = LightweightCharts.createChart(chartElement, chartOptions);
    candleSeries = chart.addCandlestickSeries({ upColor: '#00bfa5', downColor: '#f44336', borderVisible: false, wickUpColor: '#00bfa5', wickDownColor: '#f44336' });
    emaFastSeries = chart.addLineSeries({ color: '#2962FF', lineWidth: 2, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    emaSlowSeries = chart.addLineSeries({ color: '#FF6D00', lineWidth: 2, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    bbUpperSeries = chart.addLineSeries({ color: 'rgba(77, 182, 172, 0.5)', lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    bbMiddleSeries = chart.addLineSeries({ color: 'rgba(255, 236, 179, 0.5)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    bbLowerSeries = chart.addLineSeries({ color: 'rgba(77, 182, 172, 0.5)', lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });

    const volumeChartOptions = {
        width: volumeChartElement.clientWidth, height: volumeChartElement.clientHeight,
        layout: { backgroundColor: 'rgba(30, 30, 30, 0)', textColor: '#e0e0e0' },
        grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
        timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', visible: false, rightOffset: 10, barSpacing: 6 },
        rightPriceScale: { visible: true, borderColor: 'rgba(255, 255, 255, 0.1)' },
    };
    volumeChart = LightweightCharts.createChart(volumeChartElement, volumeChartOptions);
    volumeSeries = volumeChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } });
    return true;
}

// --- Time Range Synchronization ---
let isSyncing = false;
function syncTimeRange() {
    if (!chart || !volumeChart) return;
    chart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
        if (!isSyncing && timeRange && volumeChart) {
            isSyncing = true;
            volumeChart.timeScale().setVisibleRange(timeRange);
            isSyncing = false;
        }
    });
    volumeChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
        if (!isSyncing && timeRange && chart) {
            isSyncing = true;
            chart.timeScale().setVisibleRange(timeRange);
            isSyncing = false;
        }
    });
}
function calculateEMA(prices, period) {
    if (!prices || prices.length < period) return [];
    const k = 2 / (period + 1); let emaArray = []; let sum = 0;
    for (let i = 0; i < period; i++) { sum += prices[i].value; }
    emaArray.push({ time: prices[period - 1].time, value: sum / period });
    for (let i = period; i < prices.length; i++) {
        const value = prices[i].value * k + emaArray[emaArray.length - 1].value * (1 - k);
        emaArray.push({ time: prices[i].time, value });
    }
    return emaArray;
}
function calculateRSI(prices, period) {
    if (prices.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period; let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - diff) / period;
        }
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}
function calculateBollingerBands(prices, period, stdDevMultiplier) {
    if (prices.length < period) return [];
    let bbData = [];
    for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1).map(p => p.value);
        const sma = slice.reduce((sum, p) => sum + p, 0) / period;
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        bbData.push({ time: prices[i].time, upper: sma + stdDevMultiplier * stdDev, middle: sma, lower: sma - stdDevMultiplier * stdDev });
    }
    return bbData;
}
function findAndDrawSR(chartData) {
    if (!candleSeries) return { lastResistance: 0, lastSupport: 0 };
    srLines.forEach(line => candleSeries.removePriceLine(line)); srLines = [];
    if (chartData.length < 20) return { lastResistance: 0, lastSupport: 0 };
    const lookback = Math.min(15, Math.floor(chartData.length / 3));
    let resistanceLevels = [], supportLevels = [];
    for (let i = lookback; i < chartData.length - lookback; i++) {
        const windowSlice = chartData.slice(i - lookback, i + lookback + 1);
        const currentHigh = chartData[i].high; const currentLow = chartData[i].low;
        if (currentHigh === Math.max(...windowSlice.map(c => c.high))) resistanceLevels.push(currentHigh);
        if (currentLow === Math.min(...windowSlice.map(c => c.low))) supportLevels.push(currentLow);
    }
    const cluster = (levels, tolerance = 0.005) => {
        if (levels.length === 0) return [];
        const avgPrice = chartData.reduce((sum, d) => sum + d.close, 0) / chartData.length;
        const actualTolerance = avgPrice * tolerance;
        levels.sort((a, b) => a - b); const clustered = [levels[0]];
        for (let i = 1; i < levels.length; i++) {
            if (levels[i] - clustered[clustered.length - 1] > actualTolerance) clustered.push(levels[i]);
        }
        return clustered;
    };
    const uniqueResistances = cluster([...new Set(resistanceLevels)]);
    const uniqueSupports = cluster([...new Set(supportLevels)]);
    uniqueResistances.slice(-3).forEach(level => {
        const line = candleSeries.createPriceLine({ price: level, color: 'rgba(244, 67, 54, 0.7)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, axisLabelVisible: true, title: `R ${level.toFixed(2)}` });
        srLines.push(line);
    });
    uniqueSupports.slice(0, 3).forEach(level => {
        const line = candleSeries.createPriceLine({ price: level, color: 'rgba(0, 191, 165, 0.7)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, axisLabelVisible: true, title: `S ${level.toFixed(2)}` });
        srLines.push(line);
    });
    return {
        lastResistance: uniqueResistances.length > 0 ? Math.max(...uniqueResistances) : (chartData.length > 0 ? Math.max(...chartData.map(d => d.high)) : 0),
        lastSupport: uniqueSupports.length > 0 ? Math.min(...uniqueSupports) : (chartData.length > 0 ? Math.min(...chartData.map(d => d.low)) : 0)
    };
}
async function fetchFearAndGreed(retryCount = 3) {
    if (!fearGreedElement) return;
    try {
        fearGreedElement.textContent = '... جار التحميل ...'; fearGreedElement.style.color = '#bdbdbd';
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://api.alternative.me/fng/?limit=1')}`);
        if (!response.ok) throw new Error(`Proxy Error: ${response.statusText}`);
        const result = await response.json();
        if (!result || typeof result.contents !== 'string') throw new Error(`Invalid or missing content from Fear and Greed proxy. Status: ${result.status?.http_code || 'N/A'}`);
        const data = JSON.parse(result.contents);
        if (data && data.data && data.data.length > 0 && data.data[0].value && data.data[0].value_classification) {
            const fng = data.data[0]; const value = parseInt(fng.value); const classification = fng.value_classification;
            fearGreedElement.textContent = `${value} (${classification})`;
            fearGreedElement.style.color = value <= 25 ? '#f44336' : value > 25 && value <= 45 ? '#FF6D00' : value > 75 ? '#00bfa5' : '#e0e0e0';
        } else throw new Error("Invalid data structure from Fear and Greed API.");
    } catch (error) {
        console.error(`فشل في جلب مؤشر الخوف والطمع (محاولة ${4 - retryCount}):`, error.message);
        if (retryCount > 1) setTimeout(() => fetchFearAndGreed(retryCount - 1), 5000);
        else { fearGreedElement.textContent = 'فشل التحميل'; fearGreedElement.style.color = '#f44336'; }
    }
}
function generateMarketObservations(analysis) {
    let observations = []; const { rsi, price, emaFast, emaSlow, fngValue, bb } = analysis;
    if (!bb || typeof price !== 'number' || typeof rsi !== 'number') return [];
    if (price > bb.upper) observations.push({ text: "السعر اخترق نطاق بولينجر العلوي، إشارة تشبع شرائي قوية.", type: 'sell' });
    if (price < bb.lower) observations.push({ text: "السعر كسر نطاق بولينجر السفلي، إشارة تشبع بيعي قوية.", type: 'buy' });
    if (rsi > 75) observations.push({ text: `مؤشر RSI في منطقة تشبع شرائي (${rsi.toFixed(0)}).`, type: 'sell' });
    else if (rsi < 25) observations.push({ text: `مؤشر RSI في منطقة تشبع بيعي (${rsi.toFixed(0)}).`, type: 'buy' });
    if (price > bb.upper && rsi > 70) observations.push({ text: "تنبيه: تشبع شرائي مؤكد (RSI + BB)، احتمالية التصحيح مرتفعة.", type: 'sell' });
    if (price < bb.lower && rsi < 30) observations.push({ text: "فرصة: تشبع بيعي مؤكد (RSI + BB)، احتمالية الارتداد مرتفعة.", type: 'buy' });
    if (emaFast > emaSlow && price > emaSlow) observations.push({ text: "الاتجاه العام صاعد (تقاطع إيجابي والسعر فوق المتوسط البطيء).", type: 'buy' });
    else if (emaFast < emaSlow && price < emaSlow) observations.push({ text: "الاتجاه العام هابط (تقاطع سلبي والسعر تحت المتوسط البطيء).", type: 'sell' });
    else observations.push({ text: "السوق في اتجاه عرضي أو مرحلة تجميع.", type: 'hold' });
    if (fngValue && fngValue > 75) observations.push({ text: "معنويات السوق في حالة طمع شديد، قد يسبق تصحيح.", type: 'sell' });
    else if (fngValue && fngValue < 25) observations.push({ text: "معنويات السوق في حالة خوف شديد، قد يشير لفرص محتملة.", type: 'buy' });
    return Array.from(new Set(observations.map(o => o.text))).map(text => observations.find(o => o.text === text));
}
function displayObservations(observations) {
    if (!signalsLog) return; signalsLog.innerHTML = '';
    if (observations.length === 0) {
        const li = document.createElement('li'); li.className = 'log-item hold-signal';
        li.textContent = 'لا توجد ملاحظات واضحة حالياً، السوق في حالة ترقب.'; signalsLog.appendChild(li);
    } else {
        observations.forEach(obs => {
            const li = document.createElement('li'); li.className = `log-item ${obs.type}-signal`;
            li.textContent = obs.text; signalsLog.appendChild(li);
        });
    }
}
function generateTradingInstructions(analysis, lastSR) {
    const { rsi, price, emaFast, emaSlow, fngValue, bb } = analysis;
    const { lastResistance, lastSupport } = lastSR; const instructions = [];
    const risk = parseFloat(riskPercentageInput?.value) / 100 || 0.01;
    const currentCapital = parseFloat(capitalInput?.value) || 1000;
    if (emaFast > emaSlow && price > emaSlow && rsi < 65 && price > bb.middle) {
        instructions.push("دخول شراء: الاتجاه صاعد والسعر فوق المتوسطات، وزخم جيد."); logTrade('buy', price);
    } else if (emaFast < emaSlow && price < emaSlow && rsi > 35 && price < bb.middle) {
        instructions.push("تصفية/بيع: الاتجاه هابط والسعر تحت المتوسطات، وزخم بيعي."); logTrade('sell', price);
    } else instructions.push("انتظار: لا توجد إشارة واضحة للدخول أو الخروج.");
    if (rsi > 70 && price > bb.upper) instructions.push("تنبيه: تشبع شرائي قوي، احتمالية تصحيح. فكر في جني الأرباح إذا كنت في صفقة شراء.");
    else if (rsi < 30 && price < bb.lower) instructions.push("فرصة: تشبع بيعي قوي، احتمالية ارتداد. يمكن البحث عن نقاط دخول.");
    if (fngValue && fngValue > 80) instructions.push("تحذير: طمع مفرط في السوق، كن حذرًا جدًا.");
    else if (fngValue && fngValue < 20) instructions.push("ملاحظة: خوف شديد في السوق، قد تكون هناك فرص للمستثمرين الصبورين.");
    if (lastSupport > 0 && currentCapital > 0 && risk > 0 && price > lastSupport) {
        const amountToRisk = currentCapital * risk; const stopDistance = price - lastSupport;
        if (stopDistance <= 0) instructions.push(`إدارة المخاطر: السعر الحالي قريب جدًا أو أقل من مستوى الدعم (${lastSupport.toFixed(2)}). لا يمكن حساب حجم صفقة شراء آمن.`);
        else {
            const positionSize = amountToRisk / stopDistance; const stopLoss = lastSupport * (1 - 0.005);
            const takeProfit1 = price + stopDistance; const takeProfit2 = price + stopDistance * 2;
            instructions.push(`إدارة المخاطر المقترحة (شراء):`);
            // The position size for crypto is often in the base currency (e.g., BTC, ETH)
            instructions.push(`  - حجم الصفقة: ${positionSize.toFixed(4)} ${currentSymbol.replace('USDT', '')}.`);
            instructions.push(`  - وقف الخسارة (Stop Loss) عند: $${stopLoss.toFixed(2)}.`);
            instructions.push(`  - الهدف الأول (Take Profit 1) عند: $${takeProfit1.toFixed(2)}.`);
            instructions.push(`  - الهدف الثاني (Take Profit 2) عند: $${takeProfit2.toFixed(2)}.`);
        }
    }
    return instructions;
}
function displayInstructions(instructions) {
    if (!instructionsElement) return; instructionsElement.innerHTML = '';
    instructions.forEach(instr => {
        const li = document.createElement('li'); li.textContent = instr;
        li.style.padding = '6px 10px'; li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        li.style.color = instr.includes('شراء') || instr.includes('دخول') ? '#00bfa5' : instr.includes('بيع') || instr.includes('تصفية') ? '#f44336' : '#e0e0e0';
        instructionsElement.appendChild(li);
    });
    if (instructions.length === 0) instructionsElement.innerHTML = '<li>لا توجد تعليمات تداول محددة الآن.</li>';
}
function logTrade(action, price) {
    const trade = { action, price, date: new Date().toISOString() }; tradesHistory.push(trade);
}
// --- Main Data Fetching and Analysis Function ---
async function fetchDataAndAnalyze() {
    if (!candleSeries || !volumeSeries || !priceElement || !trendElement || !rsiElement || !fearGreedElement) {
        console.error("One or more critical DOM elements are missing. Aborting analysis.");
        return;
    }
    try {
        let chartData;
        let source = "API";

        if (gk_isXlsx && Object.keys(gk_xlsxFileLookup).length > 0) {
            const filename = Object.keys(gk_xlsxFileLookup)[0];
            console.log(`[Frontend] Fetching data from Excel file: ${filename}`);
            chartData = loadFileData(filename);
            source = `ملف (${filename.substring(0, 15)}...)`;
            if (!chartData || chartData.length === 0) {
                throw new Error(`لم يتم العثور على بيانات صالحة في ملف Excel: ${filename}. تحقق من تنسيق الأعمدة (time, open, high, low, close, volume) وأنها تحتوي على قيم رقمية.`);
            }
            console.log(`[Frontend] Successfully loaded ${chartData.length} data points from Excel.`);
        } else {
            console.log(`[Frontend] Fetching data for symbol: ${currentSymbol}, interval: ${currentInterval}`);

            const localProxyUrl = `http://localhost:3001/api/binance/klines`;
            // --- MODIFIED: Use currentSymbol in the API call ---
            const params = new URLSearchParams({
                symbol: currentSymbol,
                interval: currentInterval,
                limit: '300'
            });
            const apiUrl = `${localProxyUrl}?${params.toString()}`;
            console.log(`[Frontend] Fetching from local proxy URL: ${apiUrl}`);

            const response = await fetch(apiUrl);
            console.log("[Frontend] Local proxy response status:", response.status);

            if (!response.ok) {
                let errorText = `[Frontend] Network response from local proxy was not ok: ${response.statusText} (Status: ${response.status})`;
                let errorDataFromServer = {};
                try {
                    errorDataFromServer = await response.json();
                    if (errorDataFromServer.binanceError && errorDataFromServer.binanceError.msg) {
                        errorText += ` - Binance Msg: ${errorDataFromServer.binanceError.msg}`;
                    }
                } catch (e) { /* ignore if body is not json */ }
                throw new Error(errorText);
            }

            const rawData = await response.json();

            if (!Array.isArray(rawData)) {
                if (rawData.msg) throw new Error(`Binance API Error: ${rawData.msg}`);
                throw new Error('Data received from API was not an array.');
            }

            chartData = rawData.map(d => ({
                time: parseInt(d[0]) / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            })).filter(d => d.time && d.open && d.high && d.low && d.close && d.volume !== undefined);

            if (chartData.length === 0) {
                throw new Error('No valid kline data points after parsing API response.');
            }
        }

        // --- The rest of the function continues as before, as it's data-driven ---
        candleSeries.setData(chartData);
        if (chartElement && chartElement.offsetParent !== null) {
            chart.timeScale().fitContent();
        }

        const volumeData = chartData.map(d => ({
            time: d.time, value: d.volume,
            color: d.close >= d.open ? 'rgba(0, 191, 165, 0.5)' : 'rgba(244, 67, 54, 0.5)'
        }));
        volumeSeries.setData(volumeData);

        const closePrices = chartData.map(d => d.close);
        const timeAndClosePrices = chartData.map(d => ({ time: d.time, value: d.close }));

        const emaFastData = calculateEMA(timeAndClosePrices, indicatorSettings.emaFast);
        const emaSlowData = calculateEMA(timeAndClosePrices, indicatorSettings.emaSlow);
        const bbData = calculateBollingerBands(timeAndClosePrices, indicatorSettings.bbPeriod, indicatorSettings.bbStdDev);

        emaFastSeries.setData(emaFastData);
        emaSlowSeries.setData(emaSlowData);
        bbUpperSeries.setData(bbData.map(d => ({ time: d.time, value: d.upper })));
        bbMiddleSeries.setData(bbData.map(d => ({ time: d.time, value: d.middle })));
        bbLowerSeries.setData(bbData.map(d => ({ time: d.time, value: d.lower })));

        const rsiValue = calculateRSI(closePrices, indicatorSettings.rsiPeriod);
        const lastCandle = chartData[chartData.length - 1];

        if(priceElement) priceElement.textContent = `$${lastCandle.close.toFixed(2)}`;
        if(rsiElement) rsiElement.textContent = rsiValue.toFixed(2);

        const lastSR = findAndDrawSR(chartData);
        const lastEmaFast = emaFastData.length > 0 ? emaFastData[emaFastData.length - 1].value : 0;
        const lastEmaSlow = emaSlowData.length > 0 ? emaSlowData[emaSlowData.length - 1].value : 0;

        if(trendElement) {
            trendElement.textContent = lastEmaFast > lastEmaSlow ? 'صاعد 🔼' : (lastEmaFast < lastEmaSlow ? 'هابط 🔽' : 'عرضي ↔️');
            trendElement.style.color = lastEmaFast > lastEmaSlow ? '#00bfa5' : (lastEmaFast < lastEmaSlow ? '#f44336' : '#bdbdbd');
        }
        const fngText = fearGreedElement ? fearGreedElement.textContent : "";
        const fngNumericValue = fngText ? parseInt(fngText.match(/\d+/)?.[0]) : null;

        const lastBB = bbData.length > 0 ? bbData[bbData.length - 1] : { upper: lastCandle.high, lower: lastCandle.low, middle: lastCandle.close };

        const analysisData = {
            rsi: rsiValue, price: lastCandle.close, emaFast: lastEmaFast, emaSlow: lastEmaSlow,
            fngValue: fngNumericValue, bb: lastBB
        };
        const observations = generateMarketObservations(analysisData);
        displayObservations(observations);
        const instructions = generateTradingInstructions(analysisData, lastSR);
        displayInstructions(instructions);

    } catch (error) {
        console.error('[Frontend] فشل في جلب وتحليل البيانات:', error);
        if (signalsLog) {
            signalsLog.innerHTML = `<li class="log-item sell-signal">خطأ: ${error.message}.</li>`;
        }
        if (priceElement) priceElement.textContent = '---';
        if (trendElement) trendElement.textContent = '---';
        if (rsiElement) rsiElement.textContent = '---';
    }
}


// --- START: New Function to initialize the coin selector ---
function initializeCoinSelector() {
    if (!coinSelectorElement) return;
    coinSelectorElement.innerHTML = ''; // Clear previous buttons

    topCoins.forEach(coin => {
        const button = document.createElement('button');
        button.className = 'coin-btn';
        button.textContent = coin.name;
        button.dataset.symbol = coin.symbol;
        button.dataset.name = coin.name;

        if (coin.symbol === currentSymbol) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            currentSymbol = button.dataset.symbol;

            // Update chart title
            if (chartCoinTitleElement) {
                chartCoinTitleElement.textContent = `شارت ${button.dataset.name} (${currentSymbol})`;
            }

            // Update active button
            document.querySelectorAll('.coin-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Fetch new data for the selected coin
            fetchDataAndAnalyze();
        });

        coinSelectorElement.appendChild(button);
    });
}
// --- END: New Function ---


// --- User Interaction Setup ---
if (timeframeButtons.length > 0) {
    timeframeButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentInterval = button.dataset.interval;
            if (chartTitleElement) chartTitleElement.textContent = `إطار ${button.dataset.title}`;
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchDataAndAnalyze();
        });
    });
}

if (applySettingsBtn) {
    applySettingsBtn.addEventListener('click', () => {
        indicatorSettings.emaFast = parseInt(emaFastInput?.value) || 9;
        indicatorSettings.emaSlow = parseInt(emaSlowInput?.value) || 21;
        indicatorSettings.rsiPeriod = parseInt(rsiPeriodInput?.value) || 14;
        indicatorSettings.bbPeriod = parseInt(bbPeriodInput?.value) || 20;
        indicatorSettings.bbStdDev = parseFloat(bbStdDevInput?.value) || 2;
        fetchDataAndAnalyze();
    });
}

if (uploadFileInput) {
    uploadFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            gk_isXlsx = true;
            const reader = new FileReader();
            reader.onload = (e) => {
                gk_fileData = {}; gk_xlsxFileLookup = {};
                gk_fileData[file.name] = e.target.result.split(',')[1];
                gk_xlsxFileLookup[file.name] = true;
                fetchDataAndAnalyze();
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- Application Start ---
function startApp() {
    if (!initializeCharts()) {
        console.error("[Frontend] Application cannot start: Chart initialization failed.");
        if(signalsLog) signalsLog.innerHTML = `<li class="log-item sell-signal">خطأ فادح: فشل في تهيئة الشارت.</li>`;
        return;
    }
    syncTimeRange();

    // --- MODIFIED: Call the new initializer ---
    initializeCoinSelector();

    if (emaFastInput) emaFastInput.value = indicatorSettings.emaFast;
    if (emaSlowInput) emaSlowInput.value = indicatorSettings.emaSlow;
    if (rsiPeriodInput) rsiPeriodInput.value = indicatorSettings.rsiPeriod;
    if (bbPeriodInput) bbPeriodInput.value = indicatorSettings.bbPeriod;
    if (bbStdDevInput) bbStdDevInput.value = indicatorSettings.bbStdDev;

    fetchDataAndAnalyze();
    fetchFearAndGreed();

    // The interval should fetch for the current symbol, which it now does automatically
    setInterval(fetchDataAndAnalyze, 30000);
    setInterval(fetchFearAndGreed, 60 * 60 * 1000);

    if (chartElement && chart && volumeChartElement && volumeChart) {
        const chartResizeObserver = new ResizeObserver(() => {
            if (chart && volumeChart && chartElement.offsetParent !== null && volumeChartElement.offsetParent !== null) {
                try {
                    chart.applyOptions({ width: chartElement.clientWidth, height: chartElement.clientHeight });
                    volumeChart.applyOptions({ width: volumeChartElement.clientWidth, height: volumeChartElement.clientHeight });
                } catch(e) {
                    console.warn("[Frontend] Error applying options on resize:", e);
                }
            }
        });
        chartResizeObserver.observe(chartElement);
        chartResizeObserver.observe(volumeChartElement);
    }
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', startApp);