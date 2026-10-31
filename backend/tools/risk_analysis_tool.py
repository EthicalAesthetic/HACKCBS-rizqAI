import numpy as np
import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


@tool
def get_risk_analysis(symbol: str) -> dict:
    """Return quantitative portfolio and market risk metrics: Volatility, Sharpe ratio, Maximum Drawdown, Beta, and Value-at-Risk.

    Use this tool to rigorously quantify downside vulnerability, tail risk, and market sensitivity.

    Best for:
    - "What is the volatility and Sharpe ratio of TSLA?"
    - "Calculate the maximum drawdown and beta for NVDA"
    - "Quantify downside tail risk and Value-at-Risk for Apple"

    Args:
        symbol: Ticker or company name (e.g. "NVDA", "AAPL", "Tesla").

    Returns:
        dict: On success, includes:
            - symbol
            - current_price
            - annualized_volatility_pct: Standard deviation of returns annualized
            - beta: Sensitivity vs S&P 500 benchmark
            - max_drawdown_pct: Largest peak-to-trough decline over the past year
            - sharpe_ratio: Risk-adjusted return over 4.5% risk-free rate benchmark
            - sortino_ratio: Downside deviation risk-adjusted return
            - value_at_risk_95_pct: 95% confidence 1-day Value-at-Risk
            - risk_level: LOW / MODERATE / ELEVATED / HIGH
            - risk_summary: 1-2 sentence plain-English quantitative risk interpretation
    """
    try:
        clean_sym = symbol.strip()
        resolved_symbol = resolve_ticker_symbol(clean_sym) or clean_sym.upper()
        ticker = yf.Ticker(resolved_symbol)

        hist = ticker.history(period="1y", interval="1d")
        if hist.empty or len(hist) < 30:
            return {"symbol": symbol, "error": f"Insufficient historical sessions to calculate risk analytics for {symbol}"}

        closes = hist["Close"].dropna()
        current_price = round(float(closes.iloc[-1]), 2)
        returns = closes.pct_change().dropna()

        # 1. Annualized Volatility
        daily_std = returns.std()
        annual_vol = round(float(daily_std * np.sqrt(252) * 100), 2)

        # 2. Maximum Drawdown
        cum_max = closes.cummax()
        drawdown_series = (closes - cum_max) / cum_max
        max_drawdown = round(float(drawdown_series.min() * 100), 2)

        # 3. Sharpe Ratio (Benchmark risk-free rate = 4.5%)
        rf_annual = 0.045
        rf_daily = rf_annual / 252
        excess_daily_returns = returns - rf_daily
        sharpe = round(float(np.sqrt(252) * excess_daily_returns.mean() / (daily_std or 1e-6)), 2)

        # 4. Sortino Ratio (Penalizes only downside variance)
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() if len(downside_returns) > 0 else daily_std
        sortino = round(float(np.sqrt(252) * excess_daily_returns.mean() / (downside_std or 1e-6)), 2)

        # 5. Value at Risk (95% Parametric VaR)
        # z-score for 95% is ~1.645
        var_95_daily = round(float((1.645 * daily_std - returns.mean()) * 100), 2)

        # 6. Beta
        beta_val = None
        try:
            info_beta = ticker.info.get("beta")
            if info_beta is not None and str(info_beta) != "nan":
                beta_val = round(float(info_beta), 2)
        except Exception:
            pass

        if beta_val is None:
            beta_val = 1.0  # Default market neutrality if missing

        # 7. Risk Classification
        if annual_vol >= 45 or abs(max_drawdown) >= 40 or beta_val >= 1.75:
            risk_level = "HIGH"
            risk_summary = f"{resolved_symbol} exhibits high historical volatility ({annual_vol}%) and substantial peak-to-trough drawdowns ({max_drawdown}%)."
        elif annual_vol >= 28 or abs(max_drawdown) >= 25 or beta_val >= 1.25:
            risk_level = "ELEVATED"
            risk_summary = f"{resolved_symbol} carries elevated price swings ({annual_vol}% vol, beta {beta_val}), requiring disciplined position sizing."
        elif annual_vol >= 18 or abs(max_drawdown) >= 15:
            risk_level = "MODERATE"
            risk_summary = f"{resolved_symbol} trades with moderate volatility ({annual_vol}%) and a healthy risk-reward ratio."
        else:
            risk_level = "LOW"
            risk_summary = f"{resolved_symbol} demonstrates low volatility ({annual_vol}%) and defensive capital preservation characteristics."

        return {
            "symbol": resolved_symbol,
            "current_price": current_price,
            "annualized_volatility_pct": annual_vol,
            "beta": beta_val,
            "max_drawdown_1y_pct": max_drawdown,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "value_at_risk_95_daily_pct": var_95_daily,
            "risk_level": risk_level,
            "risk_summary": risk_summary,
        }

    except Exception as e:
        return {"symbol": symbol, "error": f"Failed to compute risk analysis: {str(e)}"}
