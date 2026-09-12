from fastapi import Header, HTTPException

from app.core.security import CurrentUser, InvalidTokenError, decode_session_token


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1]
    try:
        return decode_session_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session: {exc}") from exc
