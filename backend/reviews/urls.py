from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'reviews'

router = DefaultRouter()
router.register(r'albums/ratings', views.AlbumRatingViewSet, basename='album-rating')
router.register(r'songs/ratings', views.SongRatingViewSet, basename='song-rating')
router.register(r'albums/reviews', views.AlbumReviewViewSet, basename='album-review')
router.register(r'songs/reviews', views.SongReviewViewSet, basename='song-review')
router.register(r'albums/reviews/comments', views.AlbumReviewCommentViewSet, basename='album-review-comment')
router.register(r'songs/reviews/comments', views.SongReviewCommentViewSet, basename='song-review-comment')

urlpatterns = [
    path('', include(router.urls)),
]
