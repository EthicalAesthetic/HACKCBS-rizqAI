import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_mistralai import ChatMistralAI
from langchain_openrouter import ChatOpenRouter
from settings import (
    AUTH_REDIRECT_URL,
    DATABASE_URL,
    PASSWORD_RESET_REDIRECT_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Primary and fallback LLMs configured with resilient timeouts and failovers.
# Groq provides ultra-fast latency for high-throughput orchestration and structured output.
groq_llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.2,
    timeout=30,
    api_key=GROQ_API_KEY or "gsk_dummy_placeholder_key",
)

mistral_llm = ChatMistralAI(
    model="mistral-small-latest",
    temperature=0.2,
    api_key=MISTRAL_API_KEY,
    timeout=20,
)

openrouter_llm = ChatOpenRouter(
    model="openai/gpt-oss-120b",
    temperature=0.2,
    timeout=30,
    api_key=OPENROUTER_API_KEY or "sk-or-dummy_placeholder_key",
)

# Robust fallback chain: Groq -> Google -> OpenRouter
llm = mistral_llm.with_fallbacks([groq_llm, openrouter_llm])
primary_llm = llm

guardrail_llm_groq = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=GROQ_API_KEY or "gsk_dummy_placeholder_key",
    timeout=20,
    temperature=0,
)

guardrail_llm = guardrail_llm_groq.with_fallbacks([mistral_llm, openrouter_llm])
