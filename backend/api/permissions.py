from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """
    Allow write access only to the owner of the object.
    Read access is allowed for everyone.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsOwner(BasePermission):
    """
    Only allow access to the owner of the object.
    """

    def has_object_permission(self, request, view, obj):
        # Only the owner has any access
        return obj.user == request.user


class IsSpotifyConnected(BasePermission):
    """
    Require user to have connected their Spotify account.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_spotify_connected
