"""
AI Service for interacting with Google Gemini API.
Handles chat conversations and cocktail recommendations.
"""
import google.generativeai as genai
from logging import getLogger

from app.core.config import settings

log = getLogger(__name__)

# Configure Gemini API
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    log.warning("GEMINI_API_KEY not set. AI features will not work.")

# Cache the working model so we don't test every time
_cached_model: genai.GenerativeModel | None = None


def get_model() -> genai.GenerativeModel:
    """
    Get a working Gemini model. Uses gemini-2.5-flash (fast, free tier friendly).
    Caches the model to avoid re-initialization.

    Returns:
        GenerativeModel instance

    Raises:
        Exception: If model initialization fails
    """
    global _cached_model

    # Return cached model if we have one
    if _cached_model is not None:
        return _cached_model

    # Use gemini-2.5-flash (available and works well for free tier)
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        _cached_model = model
        log.info("Initialized Gemini model: gemini-2.5-flash")
        return model
    except Exception as e:
        # Fallback to gemini-2.5-pro if flash doesn't work
        try:
            model = genai.GenerativeModel("gemini-2.5-pro")
            _cached_model = model
            log.info("Initialized Gemini model: gemini-2.5-pro (fallback)")
            return model
        except Exception as e2:
            log.error(f"Failed to initialize Gemini models: {str(e)}, {str(e2)}")
            raise Exception(f"Failed to initialize Gemini model: {str(e2)}")


def build_system_prompt(pantry_ingredients: list[str]) -> str:
    """
    Build the system prompt for the AI assistant with user's pantry context.

    Args:
        pantry_ingredients: List of ingredient names in user's pantry

    Returns:
        System prompt string
    """
    if pantry_ingredients:
        ingredients_text = ", ".join(pantry_ingredients)
        ingredients_context = (
            f"The user currently has these ingredients in their cabinet: "
            f"{ingredients_text}. "
            "Use these ingredients when suggesting cocktails."
        )
    else:
        ingredients_context = (
            "The user's cabinet is currently empty - "
            "they have no ingredients yet."
        )

    prompt = f"""You are a helpful cocktail assistant for MyCabinet, a cocktail recipe app.

{ingredients_context}

Your role:
- Help users discover cocktails they can make with ingredients they have
- Suggest cocktails based on their pantry ingredients
- Provide recipe instructions and ingredient lists
- Tell users what ingredients they're missing to make specific cocktails
- Answer questions about cocktails, ingredients, and mixing techniques

Guidelines:
- When suggesting cocktails, prioritize ones that use ingredients from their pantry
- Always mention which ingredients they have and which they're missing
- Be conversational, friendly, and helpful
- If they have no ingredients or very few, suggest simple cocktails or what to buy
- Format cocktail suggestions clearly with name, ingredients, and instructions
- If asked about a specific cocktail, provide the recipe and check against their pantry

Keep responses concise but informative. Focus on helping them make drinks with what they have!"""

    return prompt


def chat_with_gemini(
    user_message: str,
    pantry_ingredients: list[str],
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Send a message to Gemini AI and get a response.

    Args:
        user_message: The user's message
        pantry_ingredients: List of ingredient names in user's pantry
        conversation_history: Optional list of previous messages in format:
            [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]

    Returns:
        Assistant's response message

    Raises:
        ValueError: If GEMINI_API_KEY is not configured
        Exception: If API call fails
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    try:
        # Build system prompt with pantry context
        system_prompt = build_system_prompt(pantry_ingredients)

        # Get the Gemini model (cached for performance)
        model = get_model()

        # Build conversation history for Gemini
        chat_history = []

        if conversation_history:
            # Convert history to Gemini format
            # Gemini uses "user" and "model" roles
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    chat_history.append({"role": "user", "parts": [content]})
                elif role == "assistant":
                    chat_history.append({"role": "model", "parts": [content]})

        # Start chat session if we have history
        if chat_history:
            chat = model.start_chat(history=chat_history)
            # Include system context in the current message
            # For ongoing conversations, prepend context to user message
            full_message = f"{system_prompt}\n\nUser: {user_message}"
            response = chat.send_message(full_message)
        else:
            # First message - include system prompt with user message
            full_message = f"{system_prompt}\n\nUser: {user_message}"
            response = model.generate_content(full_message)

        return response.text

    except Exception as e:
        log.error(f"Gemini API error: {str(e)}")
        raise Exception(f"Failed to get AI response: {str(e)}")
