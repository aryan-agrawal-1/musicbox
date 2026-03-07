"""
Apple identity token verification using Apple's public JWKS (RS256).

Apple JWKS: https://appleid.apple.com/auth/keys
Token iss:  "https://appleid.apple.com"
Token aud:  APPLE_APP_BUNDLE_ID (com.aryan.muze)
Token sub:  stable Apple user ID — store as apple_user_id
Token exp:  short-lived (~10 min) — verified automatically
"""
import logging
import requests
import jwt
from jwt.algorithms import RSAAlgorithm
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
JWKS_CACHE_KEY = "apple_jwks"
JWKS_CACHE_TIMEOUT = 86400  # 24 hours


class AppleTokenError(Exception):
    pass


def _fetch_apple_jwks() -> dict:
    cached = cache.get(JWKS_CACHE_KEY)
    if cached:
        return cached
    try:
        response = requests.get(APPLE_JWKS_URL, timeout=5)
        response.raise_for_status()
        jwks = response.json()
    except requests.RequestException as exc:
        raise AppleTokenError("Could not retrieve Apple public keys. Try again.") from exc
    cache.set(JWKS_CACHE_KEY, jwks, JWKS_CACHE_TIMEOUT)
    return jwks


def _get_public_key(kid: str):
    jwks = _fetch_apple_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return RSAAlgorithm.from_jwk(key_data)
    # Key not found — bust cache and retry once (handles Apple key rotation)
    cache.delete(JWKS_CACHE_KEY)
    jwks = _fetch_apple_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return RSAAlgorithm.from_jwk(key_data)
    raise AppleTokenError("Apple public key not found. Please try again.")


def verify_apple_identity_token(identity_token: str) -> dict:
    """
    Verify an Apple identity token and return the decoded claims.

    Returns a dict with at minimum:
      sub   — stable Apple user ID (store this as apple_user_id)
      email — may be absent on repeat authorizations; may be a relay address

    Raises AppleTokenError on any validation failure.
    """
    try:
        header = jwt.get_unverified_header(identity_token)
    except jwt.exceptions.DecodeError as exc:
        raise AppleTokenError("Malformed Apple identity token.") from exc

    if header.get("alg") != "RS256":
        raise AppleTokenError(f"Unexpected token algorithm: {header.get('alg')}")

    public_key = _get_public_key(header["kid"])
    bundle_id = getattr(settings, "APPLE_APP_BUNDLE_ID", None)
    if not bundle_id:
        raise AppleTokenError("APPLE_APP_BUNDLE_ID not configured.")

    try:
        claims = jwt.decode(
            identity_token,
            key=public_key,
            algorithms=["RS256"],
            audience=bundle_id,
            issuer=APPLE_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise AppleTokenError("Apple identity token has expired.")
    except jwt.InvalidAudienceError:
        raise AppleTokenError("Apple token audience mismatch.")
    except jwt.InvalidIssuerError:
        raise AppleTokenError("Apple token issuer is invalid.")
    except jwt.PyJWTError as exc:
        raise AppleTokenError(f"Apple token validation failed: {exc}") from exc

    if not claims.get("sub"):
        raise AppleTokenError("Apple token missing sub claim.")
    return claims
