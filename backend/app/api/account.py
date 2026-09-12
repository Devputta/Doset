from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.security import CurrentUser
from app.models import db
from app.models.schemas import AccountSummaryOut

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/summary", response_model=AccountSummaryOut)
async def summary(user: CurrentUser = Depends(get_current_user)):
    # Deliberately returns only aggregate counts/bytes — no file paths, no
    # provider names, no internal IDs. Nothing here reveals backend
    # infrastructure to the user beyond what they already know they uploaded.
    return AccountSummaryOut(**db.account_summary(user.id))
