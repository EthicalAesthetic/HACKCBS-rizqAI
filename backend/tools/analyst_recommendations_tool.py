import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


@tool
def get_analyst_recommendations(symbol: str) -> dict:
    """Return Wall Street analyst consensus ratings, rating distributions, and target price forecasts.

    Use this tool to gauge broader institutional sentiment, consensus price targets, and implied upside/downside.

    Best for:
    - "What is the Wall Street analyst consensus on NVDA?"
    - "What are price targets for Apple?"
    - "How many analysts rate Tesla a Buy vs Sell?"

    Args:
        symbol: Ticker or company name (e.g. "NVDA", "AAPL", "Microsoft").

    Returns:
        dict: On success, includes:
            - symbol
            - current_price
            - consensus_rating: Consensus stance (STRONG_BUY, BUY, HOLD, UNDERPERFORM, SELL)
            - target_prices:
                * mean_target: Average 12-month analyst target price
                * high_target: Highest street price target
                * low_target: Lowest street price target
                * median_target: Median price target
                * implied_upside_pct: Potential percentage return to mean target
            - rating_distribution:
                * strong_buy_count
                * buy_count
                * hold_count
                * sell_count
                * strong_sell_count
                * total_analysts_covering
    """
    try:
        clean_sym = symbol.strip()
        resolved_symbol = resolve_ticker_symbol(clean_sym) or clean_sym.upper()
        ticker = yf.Ticker(resolved_symbol)

        info = ticker.info
        current_price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or ticker.fast_info.get("lastPrice")
        )

        # 1. Price Targets
        targets = getattr(ticker, "analyst_price_targets", None) or {}
        mean_tgt = targets.get("mean") or info.get("targetMeanPrice")
        high_tgt = targets.get("high") or info.get("targetHighPrice")
        low_tgt = targets.get("low") or info.get("targetLowPrice")
        med_tgt = targets.get("median") or info.get("targetMedianPrice")

        implied_upside = None
        if mean_tgt and current_price and current_price > 0:
            implied_upside = round(((mean_tgt - current_price) / current_price) * 100, 2)

        # 2. Rating Breakdown
        recs = getattr(ticker, "recommendations", None)
        strong_buy = 0
        buy = 0
        hold = 0
        sell = 0
        strong_sell = 0

        if recs is not None and not recs.empty:
            latest = recs.iloc[0]
            strong_buy = int(latest.get("strongBuy", 0))
            buy = int(latest.get("buy", 0))
            hold = int(latest.get("hold", 0))
            sell = int(latest.get("sell", 0))
            strong_sell = int(latest.get("strongSell", 0))
        else:
            # Fallback to info recommendation counts if present
            buy = int(info.get("numberOfAnalystOpinions", 0))

        total_analysts = strong_buy + buy + hold + sell + strong_sell

        # 3. Consensus Rating derivation
        rec_key = info.get("recommendationKey", "").upper()
        if rec_key:
            consensus_rating = rec_key.replace(" ", "_")
        elif total_analysts > 0:
            bullish_ratio = (strong_buy + buy) / total_analysts
            bearish_ratio = (sell + strong_sell) / total_analysts
            if bullish_ratio >= 0.70:
                consensus_rating = "STRONG_BUY"
            elif bullish_ratio >= 0.50:
                consensus_rating = "BUY"
            elif bearish_ratio >= 0.40:
                consensus_rating = "UNDERPERFORM"
            else:
                consensus_rating = "HOLD"
        else:
            consensus_rating = "NEUTRAL"

        return {
            "symbol": resolved_symbol,
            "current_price": f"${current_price:.2f}" if current_price else "N/A",
            "consensus_rating": consensus_rating,
            "target_prices": {
                "mean_target": f"${mean_tgt:.2f}" if mean_tgt else "N/A",
                "high_target": f"${high_tgt:.2f}" if high_tgt else "N/A",
                "low_target": f"${low_tgt:.2f}" if low_tgt else "N/A",
                "median_target": f"${med_tgt:.2f}" if med_tgt else "N/A",
                "implied_upside_pct": f"{implied_upside}%" if implied_upside is not None else "N/A",
            },
            "rating_distribution": {
                "strong_buy": strong_buy,
                "buy": buy,
                "hold": hold,
                "sell": sell,
                "strong_sell": strong_sell,
                "total_covering_analysts": total_analysts,
            },
        }

    except Exception as e:
        return {"symbol": symbol, "error": f"Failed to retrieve analyst recommendations: {str(e)}"}
