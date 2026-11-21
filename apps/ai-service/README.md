# AI Service (FastAPI)

Python microservice providing AI capabilities and RAG document retrieval for **AI Interactive Classroom**.

## Architecture

- **Framework**: FastAPI with Pydantic v2 schemas and Uvicorn ASGI server.
- **LLM Integration**: LiteLLM client for multi-model inference (OpenAI, Anthropic, Gemini, local models).
- **RAG & Embeddings**:
  - `/ai/embeddings/extract`: Document text extraction and chunking.
  - `/ai/embeddings/ingest`: Vector embedding generation.
  - `/ai/retrieval/search`: Cosine similarity vector search over document chunks with strict classroom/school scope filtering.
- **Geometry Verification**: Contract-tested geometric calculation engine validating TS↔Python formulas.

## Development

```bash
# Install dependencies with uv
uv sync

# Run development server on port 8100
uv run uvicorn app.main:app --reload --port 8100

# Run Pytest suite
uv run pytest tests/ -v
```
