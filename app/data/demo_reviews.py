from app.models.enums import FitFeedback
from app.schemas.recommendation import RecommendResponse

DEMO_REVIEWS = [
    {
        "review_text": (
            "Ordered my usual size M but couldn't zip it up comfortably. "
            "The shoulders and chest feel very tight. Had to exchange for L."
        ),
        "rating": 2.5,
        "purchased_size": "M",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
    {
        "review_text": (
            "Runs at least one size small compared to other Zara jackets I own. "
            "If you want to layer a hoodie underneath, definitely size up."
        ),
        "rating": 3.0,
        "purchased_size": "M",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
    {
        "review_text": (
            "I'm usually a size L and bought L — way too snug in the chest and arms. "
            "XL fits much better. Beautiful jacket but the fit is very slim."
        ),
        "rating": 3.5,
        "purchased_size": "L",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
    {
        "review_text": (
            "Slim fit jacket. Size S was impossible to move in. "
            "Check the size chart and go up if you're between sizes."
        ),
        "rating": 2.0,
        "purchased_size": "S",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
    {
        "review_text": (
            "Bought M based on reviews saying it runs small — still a bit tight "
            "across the shoulders but wearable. Would recommend L for a relaxed fit."
        ),
        "rating": 3.5,
        "purchased_size": "M",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
    {
        "review_text": (
            "Sized up to XL (normally wear L) and it fits perfectly with room "
            "for a thin sweater. Glad I read the reviews first."
        ),
        "rating": 4.5,
        "purchased_size": "XL",
        "fit_feedback": FitFeedback.FITS,
    },
    {
        "review_text": (
            "Fabric has no stretch. Feels tailored and narrow in the torso. "
            "Not for broad shoulders unless you go up a size."
        ),
        "rating": 3.0,
        "purchased_size": "L",
        "fit_feedback": FitFeedback.TOO_SMALL,
    },
]

MOCK_RECOMMENDATION = RecommendResponse(
    recommended_size="L",
    confidence_score=85,
    reasoning=(
        "Roughly 80% of reviews report this item runs small or snug, especially "
        "in the shoulders and chest. Based on your Zara benchmark size and "
        "preference for a regular outerwear fit, we recommend sizing up to L "
        "instead of your usual M for a more comfortable fit."
    ),
    is_demo=True,
)
