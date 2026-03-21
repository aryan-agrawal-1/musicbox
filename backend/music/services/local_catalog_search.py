"""Local DB search for albums, tracks, and artists (no external APIs)."""

from __future__ import annotations

from django.db.models import (
    Case,
    ExpressionWrapper,
    F,
    FloatField,
    IntegerField,
    Q,
    Value,
    When,
)
from django.db.models.functions import Coalesce

from music.models import Album, Artist, Song


def _popularity_expr():
    return ExpressionWrapper(
        Coalesce(F('avg_rating'), 0.0) * F('total_ratings'),
        output_field=FloatField(),
    )


def search_artists_local(query: str, *, limit: int, offset: int) -> list[Artist]:
    q = query.strip()
    if not q:
        return []
    match = Q(name__iexact=q) | Q(name__icontains=q)
    qs = (
        Artist.objects.filter(match)
        .annotate(
            match_rank=Case(
                When(name__iexact=q, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by('match_rank', 'name', 'id')
    )
    return list(qs[offset : offset + limit])


def search_albums_local(query: str, *, limit: int, offset: int) -> list[Album]:
    q = query.strip()
    if not q:
        return []
    match = Q(name__icontains=q) | Q(artists__name__icontains=q)
    qs = (
        Album.objects.filter(match)
        .prefetch_related('artists')
        .distinct()
        .annotate(popularity_score=_popularity_expr())
        .annotate(
            match_rank=Case(
                When(name__iexact=q, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by('match_rank', '-popularity_score', '-total_ratings', 'id')
    )
    return list(qs[offset : offset + limit])


def search_songs_local(query: str, *, limit: int, offset: int) -> list[Song]:
    q = query.strip()
    if not q:
        return []
    match = (
        Q(name__icontains=q)
        | Q(artists__name__icontains=q)
        | Q(album__name__icontains=q)
    )
    qs = (
        Song.objects.filter(match)
        .select_related('album')
        .prefetch_related('artists')
        .distinct()
        .annotate(popularity_score=_popularity_expr())
        .annotate(
            match_rank=Case(
                When(name__iexact=q, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        .order_by('match_rank', '-popularity_score', '-total_ratings', 'id')
    )
    return list(qs[offset : offset + limit])
