from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # API v1 routes
    path("api/v1/", include([
        # Authentication
        path("auth/", include("accounts.urls")),

        # JWT token endpoints
        path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
        path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

        # Reviews and Ratings
        path("reviews/", include("reviews.urls")),

        # Music (Albums, Songs, Artists, Search, Listening History)
        path("music/", include("music.urls")),

        # Social (Follow and Feed)
        path("social/", include("social.urls")),

        # Push notifications
        path("notifications/", include("notifications.urls")),

        # API schema and documentation
        path("schema/", SpectacularAPIView.as_view(), name="schema"),
        path("schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ])),
]
