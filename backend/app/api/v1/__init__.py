from fastapi import APIRouter

from . import (
    routes_assistant,
    routes_auth,
    routes_auth_account,
    routes_auth_email,
    routes_health,
    routes_ingredients,
    routes_profile,
    routes_recommendations,
)

api_v1 = APIRouter()
api_v1.include_router(routes_auth.router)
api_v1.include_router(routes_auth_email.router)
api_v1.include_router(routes_auth_account.router)
api_v1.include_router(routes_health.router)
api_v1.include_router(routes_assistant.router)
api_v1.include_router(routes_ingredients.router)
api_v1.include_router(routes_profile.router)
api_v1.include_router(routes_recommendations.router)