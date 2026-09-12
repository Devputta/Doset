"""
Auth for the backend is deliberately simple: the frontend (Next.js) is the
only place that issues sessions (see doc-assistant/src/lib/auth/session.ts).
Every request that reaches this API carries that same HS256 JWT as a Bearer
token — the backend just verifies the signature with the shared
SESSION_SECRET and reads the embedded user. No separate user database, no
second login flow, and the backend still doesn't have to *trust* Next.js
blindly: it trusts the token, exactly as it would if the browser called it
directly.
"""

from dataclasses import dataclass

import jwt

from app.core.config import settings


class InvalidTokenError(Exception):
    pass


@dataclass
class CurrentUser:
    id: str
    username: str
    email: str


def decode_session_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    user_id = payload.get("id")
    username = payload.get("username")
    email = payload.get("email")
    if not isinstance(user_id, str) or not isinstance(username, str) or not isinstance(email, str):
        raise InvalidTokenError("Session token is missing required claims")

    return CurrentUser(id=user_id, username=username, email=email)
