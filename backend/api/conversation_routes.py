from datetime import datetime, timezone
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from auth import AuthUser, require_application_user as require_user
from database.db import SessionLocal, get_db
from database.models import Conversation, Message
from schemas.conversation import ChatRequest
from .helpers import get_message_content, serialize_node_output

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/health")
async def conversations_health():
    return {"status": "ok"}


@router.post("/messages/stream")
async def conversation_stream(
    chat_request: ChatRequest,
    request: Request,
    user: AuthUser = Depends(require_user),
) -> StreamingResponse:
    """Run an investment research query and stream execution updates via SSE."""
    query = chat_request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query must not be empty")

    graph = request.app.state.graph
    conversation_id = chat_request.conversation_id or str(uuid.uuid4())
    thread_id = f"{user.id}:{conversation_id}"

    async def event_generator():
        db = SessionLocal()
        try:
            conv = db.query(Conversation).filter_by(id=conversation_id, user_id=user.id).first()
            if not conv:
                title = query if len(query) <= 40 else query[:37] + "..."
                conv = Conversation(
                    id=conversation_id,
                    user_id=user.id,
                    title=title,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(conv)
            else:
                if conv.title in ("New Analysis", "New Chat"):
                    conv.title = query if len(query) <= 40 else query[:37] + "..."
                conv.updated_at = datetime.now(timezone.utc)
            db.commit()

            # 2. Persist user message
            user_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                role="user",
                content=query,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user_msg)
            db.commit()

            # Emit conversation ID confirmation
            yield f"data: {json.dumps({'node': 'conversation', 'data': {'conversation_id': conversation_id}})}\n\n"

            # 3. Stream LangGraph execution updates
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
                        try:
                            assistant_msg = Message(
                                id=str(uuid.uuid4()),
                                conversation_id=conversation_id,
                                role="assistant",
                                agent_name=node_name,
                                content=content,
                                created_at=datetime.now(timezone.utc),
                            )
                            db.add(assistant_msg)
                            conv.updated_at = datetime.now(timezone.utc)
                            db.commit()
                        except Exception:
                            db.rollback()

                    yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'node': 'done'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'node': 'error', 'error': str(exc)})}\n\n"
        finally:
            db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("")
async def create_conversation(
    payload: dict | None = None,
    user: AuthUser = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Explicitly create a new conversation thread."""
    conv_id = str(uuid.uuid4())
    title = (payload or {}).get("title") or "New Analysis"
    now = datetime.now(timezone.utc)
    conv = Conversation(
        id=conv_id,
        user_id=user.id,
        title=title,
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    db.commit()
    return {
        "id": conv.id,
        "title": conv.title,
        "updated_at": conv.updated_at.isoformat(),
    }


@router.get("")
async def list_conversations(
    user: AuthUser = Depends(require_user),
    db: Session = Depends(get_db),
):
    """List recent conversation threads for the authenticated user."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat() if c.updated_at else datetime.now(timezone.utc).isoformat(),
        }
        for c in convs
    ]


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    user: AuthUser = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Retrieve messages for a given conversation thread."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "agent_name": m.agent_name,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else datetime.now(timezone.utc).isoformat(),
        }
        for m in msgs
    ]


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: AuthUser = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation thread."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conv)
    db.commit()
    return {"status": "ok"}
