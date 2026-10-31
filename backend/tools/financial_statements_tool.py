import yfinance as yf
from langchain_core.tools import tool
from tools.helpers import resolve_ticker_symbol


def _format_curr(val) -> str:
    """Format large numbers into B (billions) or M (millions)."""
    if val is None or val == "" or str(val) == "nan":
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


def _safe_float(df, row_name, col_idx=0):
    """Safely extract a float value from a pandas DataFrame by row index label."""
    if df is None or df.empty:
        return None
    try:
        # Match case-insensitively or exact match
        for r in df.index:
            if row_name.lower() in str(r).lower():
                val = df.iloc[df.index.get_loc(r), col_idx]
                if str(val) != "nan" and val is not None:
                    return float(val)
    except Exception:
        pass
    return None


@tool
def get_financial_statements(symbol: str) -> dict:
    """Return core income statement, balance sheet, and cash flow statement highlights for a company.

    Use this tool when evaluating company financial health, solvency, profitability, and cash generation.

    Best for:
    - "Show me Apple's balance sheet and debt"
    - "What is NVIDIA's revenue and free cash flow?"
    - "Analyze income statement and margins for Tesla"

    Args:
        symbol: Ticker or company name (e.g. "MSFT", "Apple", "NVDA").

    Returns:
        dict: On success, includes structured highlights across:
            - income_statement: Total Revenue, Gross Profit, Operating Income, Net Income, Margins
            - balance_sheet: Cash & Cash Equivalents, Total Assets, Total Liabilities, Total Debt, Net Debt, Stockholders Equity
            - cash_flow: Operating Cash Flow, Capital Expenditure, Free Cash Flow
            - fiscal_date: Most recent reported fiscal period
    """
    try:
        clean_sym = symbol.strip()
        resolved_symbol = resolve_ticker_symbol(clean_sym) or clean_sym.upper()
        ticker = yf.Ticker(resolved_symbol)

        fin = ticker.financials
        bs = ticker.balance_sheet
        cf = ticker.cashflow

        fiscal_date = None
        if fin is not None and not fin.empty and len(fin.columns) > 0:
            fiscal_date = str(fin.columns[0]).split(" ")[0]

        # 1. Income Statement Highlights
        revenue = _safe_float(fin, "Total Revenue") or _safe_float(fin, "Operating Revenue")
        gross_profit = _safe_float(fin, "Gross Profit")
        operating_income = _safe_float(fin, "Operating Income")
        net_income = _safe_float(fin, "Net Income") or _safe_float(fin, "Net Income Common Stockholders")

        gross_margin = round((gross_profit / revenue) * 100, 2) if gross_profit and revenue else None
        operating_margin = round((operating_income / revenue) * 100, 2) if operating_income and revenue else None
        net_margin = round((net_income / revenue) * 100, 2) if net_income and revenue else None

        # 2. Balance Sheet Highlights
        cash = _safe_float(bs, "Cash And Cash Equivalents") or _safe_float(bs, "Cash Cash Equivalents And Short Term Investments")
        total_assets = _safe_float(bs, "Total Assets")
        total_liabilities = _safe_float(bs, "Total Liabilities Net Minority Interest") or _safe_float(bs, "Total Liabilities")
        total_debt = _safe_float(bs, "Total Debt")
        net_debt = _safe_float(bs, "Net Debt")
        equity = _safe_float(bs, "Stockholders Equity") or _safe_float(bs, "Common Stock Equity")

        debt_to_equity = round((total_debt / equity), 2) if total_debt and equity else None

        # 3. Cash Flow Highlights
        op_cashflow = _safe_float(cf, "Operating Cash Flow") or _safe_float(cf, "Cash Flowsfromusedin Operating Activities")
        capex = _safe_float(cf, "Capital Expenditure")
        free_cashflow = _safe_float(cf, "Free Cash Flow")
        if free_cashflow is None and op_cashflow is not None and capex is not None:
            free_cashflow = op_cashflow + capex  # capex is typically negative in statements

        return {
            "symbol": resolved_symbol,
            "fiscal_period": fiscal_date or "Latest Reported",
            "income_statement": {
                "total_revenue": _format_curr(revenue),
                "gross_profit": _format_curr(gross_profit),
                "operating_income": _format_curr(operating_income),
                "net_income": _format_curr(net_income),
                "gross_margin_pct": f"{gross_margin}%" if gross_margin is not None else "N/A",
                "operating_margin_pct": f"{operating_margin}%" if operating_margin is not None else "N/A",
                "net_profit_margin_pct": f"{net_margin}%" if net_margin is not None else "N/A",
            },
            "balance_sheet": {
                "cash_and_equivalents": _format_curr(cash),
                "total_assets": _format_curr(total_assets),
                "total_liabilities": _format_curr(total_liabilities),
                "total_debt": _format_curr(total_debt),
                "net_debt": _format_curr(net_debt),
                "stockholders_equity": _format_curr(equity),
                "debt_to_equity_ratio": debt_to_equity if debt_to_equity is not None else "N/A",
            },
            "cash_flow": {
                "operating_cash_flow": _format_curr(op_cashflow),
                "capital_expenditures": _format_curr(capex),
                "free_cash_flow": _format_curr(free_cashflow),
            },
        }

    except Exception as e:
        return {"symbol": symbol, "error": f"Failed to retrieve financial statements: {str(e)}"}
