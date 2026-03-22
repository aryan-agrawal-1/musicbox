"""
Password reset email + JWT refresh invalidation helpers.
"""
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

User = get_user_model()


def build_password_reset_link(user) -> str:
    """Build a deep link (or universal link base) with uid and token query params."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    if isinstance(uid, bytes):
        uid = uid.decode()
    token = default_token_generator.make_token(user)
    base = getattr(settings, "PASSWORD_RESET_URL_BASE", "muze://reset-password").rstrip("/")
    query = urlencode({"uid": uid, "token": token})
    sep = "?" if "?" not in base else "&"
    return f"{base}{sep}{query}"


def send_password_reset_email(user) -> None:
    """Send plain-text email with reset link. Caller must only invoke for eligible users."""
    link = build_password_reset_link(user)
    subject = "Reset your password"
    body = (
        f"Hi,\n\n"
        f"We received a request to reset the password for your account.\n\n"
        f"Open this link in the app to choose a new password:\n{link}\n\n"
        f"If you did not request this, you can ignore this email.\n"
    )
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def blacklist_refresh_tokens_for_user(user) -> None:
    """
    Blacklist all outstanding refresh tokens for this user (Simple JWT blacklist app).
    Access tokens may remain valid until expiry.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    for outstanding in OutstandingToken.objects.filter(user_id=user.pk):
        BlacklistedToken.objects.get_or_create(token=outstanding)
