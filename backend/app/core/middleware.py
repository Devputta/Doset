import logging
import time
import uuid
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("doc_assistant.request")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attaches a request ID to every request/response for log correlation —
    include it when reporting a bug and it's trivial to find the matching
    server-side log line."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 1)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %s (%sms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """A simple fixed-window limiter keyed by client IP (falling back to the
    Authorization header if present, so one browser can't be starved by
    another user behind the same NAT). This is intentionally basic — an
    in-process dict, reset on restart, no cross-instance coordination — and
    exists to demonstrate the *shape* of rate limiting the API expects
    (429 + Retry-After) rather than to be a production limiter. Swap this
    middleware for a Redis-backed limiter (e.g. slowapi + redis) before
    handling real traffic across multiple backend instances.
    """

    def __init__(self, app, *, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        key = request.headers.get("authorization", request.client.host if request.client else "unknown")
        now = time.monotonic()
        window_start = now - self.window_seconds

        hits = [t for t in self._hits[key] if t > window_start]
        if len(hits) >= self.max_requests:
            return JSONResponse(
                {"error": "rate_limited", "message": "Too many requests. Please slow down."},
                status_code=429,
                headers={"Retry-After": str(self.window_seconds)},
            )

        hits.append(now)
        self._hits[key] = hits
        return await call_next(request)
