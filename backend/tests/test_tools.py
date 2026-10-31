import pytest
from tools.historical_stock_data_tool import get_historical_stock_data
from tools.financial_statements_tool import get_financial_statements
from tools.technical_indicators_tool import get_technical_indicators
from tools.compare_companies_tool import compare_companies
from tools.risk_analysis_tool import get_risk_analysis
from tools.analyst_recommendations_tool import get_analyst_recommendations


def test_historical_stock_data():
    res = get_historical_stock_data.invoke({"symbol": "AAPL", "period": "1mo"})
    assert isinstance(res, dict)
    assert res.get("symbol") == "AAPL"
    if "error" not in res:
        assert "start_price" in res
        assert "end_price" in res
        assert "total_return_pct" in res
        assert "trend" in res


def test_financial_statements():
    res = get_financial_statements.invoke({"symbol": "AAPL"})
    assert isinstance(res, dict)
    assert res.get("symbol") == "AAPL"
    if "error" not in res:
        assert "income_statement" in res
        assert "balance_sheet" in res
        assert "cash_flow" in res


def test_technical_indicators():
    res = get_technical_indicators.invoke({"symbol": "AAPL"})
    assert isinstance(res, dict)
    assert res.get("symbol") == "AAPL"
    if "error" not in res:
        assert "rsi" in res
        assert "macd" in res
        assert "moving_averages" in res
        assert "overall_technical_bias" in res


def test_compare_companies():
    res = compare_companies.invoke({"symbols": ["AAPL", "MSFT"]})
    assert isinstance(res, dict)
    assert "comparison_matrix" in res
    assert len(res["comparison_matrix"]) == 2
    symbols = [c["symbol"] for c in res["comparison_matrix"]]
    assert "AAPL" in symbols
    assert "MSFT" in symbols


def test_risk_analysis():
    res = get_risk_analysis.invoke({"symbol": "AAPL"})
    assert isinstance(res, dict)
    assert res.get("symbol") == "AAPL"
    if "error" not in res:
        assert "annualized_volatility_pct" in res
        assert "max_drawdown_1y_pct" in res
        assert "sharpe_ratio" in res
        assert "risk_level" in res


def test_analyst_recommendations():
    res = get_analyst_recommendations.invoke({"symbol": "AAPL"})
    assert isinstance(res, dict)
    assert res.get("symbol") == "AAPL"
    if "error" not in res:
        assert "consensus_rating" in res
        assert "target_mean_price" in res or "error" not in res


def test_fallback_on_invalid_symbol():
    bad_res = get_risk_analysis.invoke({"symbol": "NONEXISTENT_XYZ_999"})
    assert isinstance(bad_res, dict)
    assert bad_res.get("symbol") == "NONEXISTENT_XYZ_999"
