from django.urls import path
from . import views

app_name = 'social'

urlpatterns = [
    # Follow/Unfollow
    path('follow/', views.follow_user, name='follow'),
    path('unfollow/<int:user_id>/', views.unfollow_user, name='unfollow'),

    # Feed
    path('feed/', views.FeedView.as_view(), name='feed'),

    # User followers/following lists
    path('users/<str:username>/is-following/', views.is_following_user, name='is-following'),
    path('users/<str:username>/followers/', views.UserFollowersView.as_view(), name='user-followers'),
    path('users/<str:username>/following/', views.UserFollowingView.as_view(), name='user-following'),
]
