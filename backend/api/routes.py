import json
import uuid
import yfinance as yf

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth import AuthUser, require_application_user as require_user
from schemas.conversation import ChatRequest
from tools.helpers import resolve_ticker_symbol
from .helpers import get_message_content, serialize_node_output

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("/candles/{symbol}")
async def get_candles(
    symbol: str,
    period: str = "3mo",
    interval: str = "1d",
):
    """Retrieve OHLCV candlestick data and technical bounds for a company."""
    clean_sym = symbol.strip()
    if not clean_sym:
        raise HTTPException(status_code=400, detail="Symbol must not be empty")

    resolved = resolve_ticker_symbol(clean_sym) or clean_sym.upper()

    valid_periods = {"1mo", "3mo", "6mo", "1y", "2y"}
    valid_intervals = {"1d", "1wk", "1h"}

    p = period if period in valid_periods else "3mo"
    i = interval if interval in valid_intervals else "1d"

    try:
        ticker = yf.Ticker(resolved)
        df = ticker.history(period=p, interval=i)

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No candlestick data available for {clean_sym}")

        candles = []
        for idx, row in df.iterrows():
            date_str = idx.strftime("%Y-%m-%d")
            candles.append({
                "date": date_str,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        if not candles:
            raise HTTPException(status_code=404, detail=f"No price candles generated for {clean_sym}")

        # Compute 20-period Moving Average
        for idx in range(len(candles)):
            if idx >= 19:
                subset = [c["close"] for c in candles[idx - 19 : idx + 1]]
                candles[idx]["sma20"] = round(sum(subset) / len(subset), 2)
            else:
                candles[idx]["sma20"] = None

        first_close = candles[0]["open"]
        last_close = candles[-1]["close"]
        price_change = round(last_close - first_close, 2)
        price_change_pct = round((price_change / first_close) * 100, 2) if first_close else 0.0

        all_highs = [c["high"] for c in candles]
        all_lows = [c["low"] for c in candles]
        all_volumes = [c["volume"] for c in candles]

        summary = {
            "symbol": resolved,
            "period": p,
            "interval": i,
            "candle_count": len(candles),
            "latest_close": last_close,
            "period_change": price_change,
            "period_change_percent": price_change_pct,
            "period_high": max(all_highs) if all_highs else last_close,
            "period_low": min(all_lows) if all_lows else last_close,
            "avg_volume": int(sum(all_volumes) / len(all_volumes)) if all_volumes else 0,
        }

        return {
            "symbol": resolved,
            "summary": summary,
            "candles": candles,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market candles: {exc}")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/stream")
async def analyze_stream(
    chat_request: ChatRequest,
    request: Request,
    user: AuthUser = Depends(require_user),
) -> StreamingResponse:
    """Run an investment research query without persisting conversations or messages."""
    query = chat_request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query must not be empty")

    graph = request.app.state.graph
    thread_id = f"{user.id}:{uuid.uuid4()}"

    async def event_generator():
        try:
            async for update in graph.astream(
                {"user_query": query},
                config={"configurable": {"thread_id": thread_id}},
                stream_mode="updates",
            ):
                for node_name, node_output in update.items():
                    node_output = node_output or {}
                    content = get_message_content(node_name, node_output)
                    event = serialize_node_output(node_name, node_output)
                    if content:
                        event["content"] = content
                    yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'node': 'done'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'node': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
