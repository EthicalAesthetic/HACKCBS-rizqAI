import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


@tool
def get_historical_stock_data(symbol: str, period: str = "1y", interval: str = "1d") -> dict:
    """Return historical stock performance, cumulative returns, and price trend over time.

    Use this tool when evaluating how an equity has traded across time, returns over past periods,
    and cyclical price momentum.

    Best for:
    - "How has AAPL performed over the past year?"
    - "Show me historical returns and trading range for TSLA"
    - "What is the 6-month price trend for NVDA?"

    Args:
        symbol: Ticker or company name (e.g. "AAPL", "NVDA", "Tesla").
        period: Historical lookback duration. Valid: "1mo", "3mo", "6mo", "1y", "2y", "5y". Default is "1y".
        interval: Data cadence. Valid: "1d" (daily), "1wk" (weekly), "1mo" (monthly). Default is "1d".

    Returns:
        dict: On success, includes:
            symbol, period, interval, start_date, end_date, start_price, end_price,
            total_return_pct, annualized_return_pct, period_high, period_low,
            avg_daily_volume, trend (BULLISH/BEARISH/CONSOLIDATING),
            and recent_performance breakdown (1W, 1M, 3M, 6M, 1Y when available).
    """
    try:
        clean_sym = symbol.strip()
        resolved_symbol = resolve_ticker_symbol(clean_sym) or clean_sym.upper()
        ticker = yf.Ticker(resolved_symbol)

        valid_periods = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}
        valid_intervals = {"1d", "1wk", "1mo"}

        p = period if period in valid_periods else "1y"
        i = interval if interval in valid_intervals else "1d"

        hist = ticker.history(period=p, interval=i)
        if hist.empty:
            return {"symbol": symbol, "error": f"No historical price data found for {symbol}"}

        closes = hist["Close"].dropna()
        if len(closes) < 2:
            return {"symbol": symbol, "error": f"Insufficient historical sessions for {symbol}"}

        start_date = str(closes.index[0].strftime("%Y-%m-%d"))
        end_date = str(closes.index[-1].strftime("%Y-%m-%d"))
        start_price = round(float(closes.iloc[0]), 2)
        end_price = round(float(closes.iloc[-1]), 2)

        total_return = round(((end_price - start_price) / start_price) * 100, 2)

        # Annualized return estimation
        days = max(1, (closes.index[-1] - closes.index[0]).days)
        years = days / 365.25
        if years >= 0.25 and start_price > 0:
            ann_return = round((((end_price / start_price) ** (1 / years)) - 1) * 100, 2)
        else:
            ann_return = total_return

        period_high = round(float(hist["High"].max()), 2)
        period_low = round(float(hist["Low"].min()), 2)
        avg_vol = int(hist["Volume"].mean()) if "Volume" in hist else 0

        # Trend determination using 20 and 50 period simple averages
        if len(closes) >= 50:
            sma20 = float(closes.rolling(20).mean().iloc[-1])
            sma50 = float(closes.rolling(50).mean().iloc[-1])
            if end_price > sma20 > sma50:
                trend = "STRONG_BULLISH"
            elif end_price > sma20:
                trend = "BULLISH"
            elif end_price < sma20 < sma50:
                trend = "STRONG_BEARISH"
            elif end_price < sma20:
                trend = "BEARISH"
            else:
                trend = "CONSOLIDATING"
        elif total_return > 5:
            trend = "BULLISH"
        elif total_return < -5:
            trend = "BEARISH"
        else:
            trend = "NEUTRAL"

        # Trailing performance sub-windows
        perf = {}
        for window_days, label in [(5, "1W"), (21, "1M"), (63, "3M"), (126, "6M"), (252, "1Y")]:
            if len(closes) > window_days:
                win_start = float(closes.iloc[-window_days - 1])
                win_ret = round(((end_price - win_start) / win_start) * 100, 2)
                perf[label] = win_ret

        return {
            "symbol": resolved_symbol,
            "period": p,
            "interval": i,
            "start_date": start_date,
            "end_date": end_date,
            "start_price": start_price,
            "end_price": end_price,
            "total_return_pct": total_return,
            "annualized_return_pct": ann_return,
            "period_high": period_high,
            "period_low": period_low,
            "avg_daily_volume": avg_vol,
            "trend": trend,
            "trailing_returns": perf,
        }

    except Exception as e:
        return {"symbol": symbol, "error": f"Failed to retrieve historical stock data: {str(e)}"}
