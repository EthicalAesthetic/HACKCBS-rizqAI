import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


@tool
def get_technical_indicators(symbol: str) -> dict:
    """Return key quantitative technical indicators: RSI, MACD, SMA (20, 50, 200), and EMA (12, 26).

    Use this tool when evaluating technical momentum, trend strength, overbought/oversold levels,
    and moving average crossovers for an equity.

    Best for:
    - "What is the RSI and MACD for NVDA?"
    - "Check moving average crossovers (SMA 50 vs 200) for AAPL"
    - "Is Tesla technically overbought or oversold right now?"

    Args:
        symbol: Ticker or company name (e.g. "NVDA", "Tesla", "MSFT").

    Returns:
        dict: On success, includes:
            - current_price
            - rsi_14: numerical value, status (OVERBOUGHT, OVERSOLD, NEUTRAL)
            - macd: macd_line, signal_line, histogram, signal (BULLISH_CROSSOVER, BEARISH_CROSSOVER, BULLISH, BEARISH)
            - moving_averages:
                * sma_20, sma_50, sma_200
                * ema_12, ema_26
                * golden_cross: bool (SMA 50 > SMA 200)
                * price_vs_sma200: pct above/below 200-day trendline
            - technical_bias: STRONG_BULLISH / BULLISH / NEUTRAL / BEARISH / STRONG_BEARISH
    """
    try:
        clean_sym = symbol.strip()
        resolved_symbol = resolve_ticker_symbol(clean_sym) or clean_sym.upper()
        ticker = yf.Ticker(resolved_symbol)

        # Pull 1 year of daily history to ensure 200 SMA can be calculated
        hist = ticker.history(period="1y", interval="1d")
        if hist.empty or len(hist) < 30:
            return {"symbol": symbol, "error": f"Insufficient price history to calculate technical indicators for {symbol}"}

        closes = hist["Close"].dropna()
        current_price = round(float(closes.iloc[-1]), 2)

        # 1. RSI (14 period)
        delta = closes.diff()
        gain = delta.clip(lower=0)
        loss = -1 * delta.clip(upper=0)
        avg_gain = gain.rolling(window=14).mean().iloc[-1]
        avg_loss = loss.rolling(window=14).mean().iloc[-1]
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = round(float(100 - (100 / (1 + rs))), 2)

        if rsi >= 70:
            rsi_status = "OVERBOUGHT"
        elif rsi <= 30:
            rsi_status = "OVERSOLD"
        elif rsi >= 55:
            rsi_status = "BULLISH_MOMENTUM"
        elif rsi <= 45:
            rsi_status = "BEARISH_MOMENTUM"
        else:
            rsi_status = "NEUTRAL"

        # 2. Moving Averages (SMA 20, 50, 200 & EMA 12, 26)
        sma20 = round(float(closes.rolling(window=20).mean().iloc[-1]), 2) if len(closes) >= 20 else None
        sma50 = round(float(closes.rolling(window=50).mean().iloc[-1]), 2) if len(closes) >= 50 else None
        sma200 = round(float(closes.rolling(window=200).mean().iloc[-1]), 2) if len(closes) >= 200 else None

        ema12 = round(float(closes.ewm(span=12, adjust=False).mean().iloc[-1]), 2)
        ema26 = round(float(closes.ewm(span=26, adjust=False).mean().iloc[-1]), 2)

        golden_cross = bool(sma50 > sma200) if (sma50 and sma200) else None
        price_vs_sma200 = round(((current_price - sma200) / sma200) * 100, 2) if sma200 else None

        # 3. MACD (12, 26, 9)
        ema12_series = closes.ewm(span=12, adjust=False).mean()
        ema26_series = closes.ewm(span=26, adjust=False).mean()
        macd_series = ema12_series - ema26_series
        signal_series = macd_series.ewm(span=9, adjust=False).mean()

        macd_val = round(float(macd_series.iloc[-1]), 2)
        signal_val = round(float(signal_series.iloc[-1]), 2)
        hist_val = round(float(macd_val - signal_val), 2)

        prev_macd = float(macd_series.iloc[-2]) if len(macd_series) >= 2 else macd_val
        prev_signal = float(signal_series.iloc[-2]) if len(signal_series) >= 2 else signal_val

        if prev_macd <= prev_signal and macd_val > signal_val:
            macd_signal = "BULLISH_CROSSOVER"
        elif prev_macd >= prev_signal and macd_val < signal_val:
            macd_signal = "BEARISH_CROSSOVER"
        elif macd_val > signal_val:
            macd_signal = "BULLISH"
        else:
            macd_signal = "BEARISH"

        # 4. Overall Technical Bias Synthesis
        bull_score = 0
        if rsi > 50:
            bull_score += 1
        if macd_val > signal_val:
            bull_score += 1
        if sma20 and current_price > sma20:
            bull_score += 1
        if sma50 and current_price > sma50:
            bull_score += 1
        if sma200 and current_price > sma200:
            bull_score += 1

        if bull_score >= 4:
            technical_bias = "STRONG_BULLISH"
        elif bull_score == 3:
            technical_bias = "MODERATELY_BULLISH"
        elif bull_score == 2:
            technical_bias = "NEUTRAL"
        elif bull_score == 1:
            technical_bias = "MODERATELY_BEARISH"
        else:
            technical_bias = "STRONG_BEARISH"

        return {
            "symbol": resolved_symbol,
            "current_price": current_price,
            "rsi": {
                "period": 14,
                "value": rsi,
                "status": rsi_status,
            },
            "macd": {
                "macd_line": macd_val,
                "signal_line": signal_val,
                "histogram": hist_val,
                "status": macd_signal,
            },
            "moving_averages": {
                "sma_20": sma20,
                "sma_50": sma50,
                "sma_200": sma200,
                "ema_12": ema12,
                "ema_26": ema26,
                "golden_cross": golden_cross,
                "price_vs_sma200_pct": price_vs_sma200,
            },
            "overall_technical_bias": technical_bias,
        }

    except Exception as e:
        return {"symbol": symbol, "error": f"Failed to compute technical indicators: {str(e)}"}
