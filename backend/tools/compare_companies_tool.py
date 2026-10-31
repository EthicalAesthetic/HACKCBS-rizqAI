import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


def _format_b_or_m(val):
    if val is None or str(val) == "nan":
        return "N/A"
    try:
        n = float(val)
        if abs(n) >= 1e12:
            return f"${n / 1e12:.2f}T"
        if abs(n) >= 1e9:
            return f"${n / 1e9:.2f}B"
        if abs(n) >= 1e6:
            return f"${n / 1e6:.2f}M"
        return f"${n:,.2f}"
    except (ValueError, TypeError):
        return str(val)


@tool
def compare_companies(symbols: list[str] | str) -> dict:
    """Compare two or more companies across valuation multiples, growth, profit margins, and risk profiles.

    Use this tool whenever the user asks for a comparative analysis, competitor breakdown, or peer comparison.

    Best for:
    - "Compare Apple and Microsoft"
    - "Who has better valuation between NVDA and AMD?"
    - "Compare Tesla, Ford, and General Motors"

    Args:
        symbols: List of ticker strings or a comma/space/vs-delimited string (e.g. ["AAPL", "MSFT"], or "NVDA vs AMD").

    Returns:
        dict: On success, includes:
            - companies: List of structured company profiles (price, market cap, trailing P/E, forward P/E, PEG ratio, profit margin, revenue growth, ROE, 52W return, beta)
            - comparison_highlights:
                * lowest_pe, highest_pe
                * highest_margin
                * highest_growth
                * largest_market_cap
    """
    try:
        # Normalize input to list of symbols
        symbol_list = []
        if isinstance(symbols, list):
            for s in symbols:
                if isinstance(s, str):
                    symbol_list.extend(s.replace(" vs ", ",").replace(" VS ", ",").replace("/", ",").split(","))
        elif isinstance(symbols, str):
            symbol_list = symbols.replace(" vs ", ",").replace(" VS ", ",").replace("/", ",").split(",")

        clean_symbols = [s.strip() for s in symbol_list if s.strip()]
        if len(clean_symbols) < 2:
            return {"error": "Please provide at least two companies to compare."}

        companies_data = []

        for raw_sym in clean_symbols[:5]:  # Limit to 5 companies max for crisp LLM context
            resolved = resolve_ticker_symbol(raw_sym) or raw_sym.upper()
            try:
                ticker = yf.Ticker(resolved)
                info = ticker.info
                price = info.get("currentPrice") or info.get("regularMarketPrice") or ticker.fast_info.get("lastPrice")
                mkt_cap = info.get("marketCap") or ticker.fast_info.get("marketCap")

                # Trailing 52W return
                fifty_two_low = info.get("fiftyTwoWeekLow") or ticker.fast_info.get("yearLow")
                fifty_two_high = info.get("fiftyTwoWeekHigh") or ticker.fast_info.get("yearHigh")

                margin = info.get("profitMargins")
                rev_growth = info.get("revenueGrowth")
                roe = info.get("returnOnEquity")

                companies_data.append({
                    "symbol": resolved,
                    "company_name": info.get("shortName") or info.get("longName") or resolved,
                    "price": f"${price:.2f}" if price else "N/A",
                    "price_num": price,
                    "market_cap": _format_b_or_m(mkt_cap),
                    "market_cap_num": mkt_cap,
                    "trailing_pe": round(float(info["trailingPE"]), 2) if info.get("trailingPE") else "N/A",
                    "forward_pe": round(float(info["forwardPE"]), 2) if info.get("forwardPE") else "N/A",
                    "peg_ratio": round(float(info["pegRatio"]), 2) if info.get("pegRatio") else "N/A",
                    "price_to_sales": round(float(info["priceToSalesTrailing12Months"]), 2) if info.get("priceToSalesTrailing12Months") else "N/A",
                    "profit_margin": f"{margin * 100:.2f}%" if margin is not None else "N/A",
                    "profit_margin_num": margin,
                    "revenue_growth": f"{rev_growth * 100:.2f}%" if rev_growth is not None else "N/A",
                    "revenue_growth_num": rev_growth,
                    "roe": f"{roe * 100:.2f}%" if roe is not None else "N/A",
                    "beta": round(float(info["beta"]), 2) if info.get("beta") else "N/A",
                    "52w_high": f"${fifty_two_high:.2f}" if fifty_two_high else "N/A",
                    "52w_low": f"${fifty_two_low:.2f}" if fifty_two_low else "N/A",
                })
            except Exception:
                companies_data.append({
                    "symbol": resolved,
                    "error": f"Failed to retrieve comparative metrics for {resolved}",
                })

        # Calculate comparative highlights across successfully fetched companies
        valid_cos = [c for c in companies_data if "error" not in c]
        highlights = {}

        if valid_cos:
            pe_valid = [c for c in valid_cos if isinstance(c.get("trailing_pe"), (int, float))]
            if pe_valid:
                lowest_pe = min(pe_valid, key=lambda x: x["trailing_pe"])
                highest_pe = max(pe_valid, key=lambda x: x["trailing_pe"])
                highlights["lowest_pe_valuation"] = f"{lowest_pe['symbol']} ({lowest_pe['trailing_pe']}x)"
                highlights["highest_pe_valuation"] = f"{highest_pe['symbol']} ({highest_pe['trailing_pe']}x)"

            growth_valid = [c for c in valid_cos if c.get("revenue_growth_num") is not None]
            if growth_valid:
                highest_growth = max(growth_valid, key=lambda x: x["revenue_growth_num"])
                highlights["highest_revenue_growth"] = f"{highest_growth['symbol']} ({highest_growth['revenue_growth']})"

            margin_valid = [c for c in valid_cos if c.get("profit_margin_num") is not None]
            if margin_valid:
                highest_margin = max(margin_valid, key=lambda x: x["profit_margin_num"])
                highlights["highest_profit_margin"] = f"{highest_margin['symbol']} ({highest_margin['profit_margin']})"

            mktcap_valid = [c for c in valid_cos if c.get("market_cap_num") is not None]
            if mktcap_valid:
                largest_cap = max(mktcap_valid, key=lambda x: x["market_cap_num"])
                highlights["largest_market_cap"] = f"{largest_cap['symbol']} ({largest_cap['market_cap']})"

        # Strip internal temporary num fields from final output
        for c in valid_cos:
            c.pop("price_num", None)
            c.pop("market_cap_num", None)
            c.pop("profit_margin_num", None)
            c.pop("revenue_growth_num", None)

        return {
            "companies_compared": [c.get("symbol") for c in companies_data],
            "comparison_matrix": companies_data,
            "relative_leaders": highlights,
        }

    except Exception as e:
        return {"error": f"Failed to execute company comparison: {str(e)}"}
