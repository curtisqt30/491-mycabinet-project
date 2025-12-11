from typing import Annotated
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services import ai_service

router = APIRouter(prefix="/assistant", tags=["assistant"])
log = getLogger(__name__)

DbDep = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def generate_mock_response(user_message: str) -> str:
    """
    Generate a mock assistant response based on user input.
    Used as a fallback when AI service is unavailable.
    """
    lower_message = user_message.lower()

    # Simple keyword-based responses
    if any(word in lower_message for word in ["hello", "hi", "hey"]):
        return "Hello! I'm your cocktail assistant. How can I help you today?"

    if any(word in lower_message for word in ["recipe", "drink", "cocktail"]):
        return (
            "I'd be happy to help you find a cocktail recipe! "
            "What ingredients do you have on hand, or what type of drink "
            "are you in the mood for?"
        )

    if any(word in lower_message for word in ["ingredient", "what can i make"]):
        return (
            "Tell me what ingredients you have, and I can suggest some "
            "great cocktails you can make with them!"
        )

    if any(word in lower_message for word in ["recommend", "suggestion"]):
        return (
            "I'd love to recommend a cocktail! What's your preference - "
            "something sweet, sour, strong, or refreshing?"
        )

    if "how" in lower_message and "make" in lower_message:
        return (
            "I can walk you through making a cocktail step by step! "
            "Which cocktail would you like to learn how to make?"
        )

    # Default response
    return (
        "That's interesting! I'm here to help with cocktail recipes, "
        "ingredient suggestions, and drink recommendations. "
        "What would you like to know?"
    )


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat(
    request: ChatRequest,
    db: DbDep,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Handle chat/assistant requests with AI-powered cocktail recommendations.

    This endpoint accepts a user message and optional conversation history,
    and returns an AI-generated response based on the user's pantry ingredients.
    Falls back to mock responses if AI service is unavailable.

    Requires authentication via Bearer token.

    Args:
        request: ChatRequest containing the user's message and optional history
        db: Database session
        current_user: Authenticated user (from JWT token)

    Returns:
        ChatResponse with the assistant's response

    Raises:
        HTTPException: If the request is invalid or processing fails
    """
    try:
        # Validate input
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        # Get user's pantry ingredients from database
        from app.models.ingredient import Ingredient
        from app.models.link_tables import UserIngredient

        pantry_items = (
            db.query(UserIngredient)
            .filter(UserIngredient.user_id == current_user.id)
            .join(Ingredient)
            .all()
        )
        pantry_ingredients = [item.ingredient.name for item in pantry_items]

        # Convert conversation history format if provided
        conversation_history = None
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]

        # Call AI service
        try:
            assistant_message = ai_service.chat_with_gemini(
                user_message=request.message.strip(),
                pantry_ingredients=pantry_ingredients,
                conversation_history=conversation_history,
            )
        except ValueError as e:
            # API key not configured - fallback to mock response
            log.warning(f"AI service not available: {str(e)}. Using mock response.")
            assistant_message = generate_mock_response(request.message.strip())
        except Exception as e:
            # AI service error - log and fallback to mock
            log.error(f"AI service error: {str(e)}. Using mock response.")
            assistant_message = generate_mock_response(request.message.strip())

        return ChatResponse(message=assistant_message, success=True)

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        log.exception("Unexpected error in assistant endpoint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {str(e)}",
        )
