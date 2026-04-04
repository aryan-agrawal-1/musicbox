from __future__ import annotations

from dataclasses import dataclass

from django.core.management.base import BaseCommand
from django.db import transaction

from music.models import ListeningHistory


def _overlap_length(current_keys: list[str], previous_keys: list[str]) -> int:
    max_overlap = min(len(current_keys), len(previous_keys))
    for overlap_size in range(max_overlap, 0, -1):
        if current_keys[-overlap_size:] == previous_keys[:overlap_size]:
            return overlap_size
    return 0


def _history_key(entry: ListeningHistory) -> str:
    if entry.source_item_id:
        return entry.source_item_id
    if entry.song.apple_music_id:
        return entry.song.apple_music_id
    return f'song:{entry.song_id}'


@dataclass
class HistoryBatch:
    entries: list[ListeningHistory]
    keys: list[str]


def _is_new_style(entry: ListeningHistory) -> bool:
    return entry.source_provider == 'apple_music' and bool(entry.source_item_id)


def _build_batches(entries: list[ListeningHistory]) -> list[HistoryBatch]:
    """Group Apple history rows into importer batches, newest first."""
    batches: list[HistoryBatch] = []
    index = 0

    while index < len(entries):
        start = entries[index]
        batch = [start]
        index += 1

        if _is_new_style(start):
            while index < len(entries):
                current = entries[index]
                previous = batch[-1]
                seconds_apart = (previous.played_at - current.played_at).total_seconds()
                if _is_new_style(current) and seconds_apart == 1:
                    batch.append(current)
                    index += 1
                    continue
                break
            ordered_entries = batch
        else:
            while index < len(entries):
                current = entries[index]
                if not _is_new_style(current) and current.played_at == start.played_at:
                    batch.append(current)
                    index += 1
                    continue
                break
            ordered_entries = sorted(batch, key=lambda entry: entry.pk)

        batches.append(
            HistoryBatch(
                entries=ordered_entries,
                keys=[_history_key(entry) for entry in ordered_entries],
            )
        )

    return batches


class Command(BaseCommand):
    help = (
        'Remove duplicate Apple Music listening-history rows created by batch '
        'imports. Without --apply this runs as a dry run.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually delete duplicate Apple Music history rows.',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        base_queryset = ListeningHistory.objects.filter(context_type='apple_music')
        queryset = (
            base_queryset
            .select_related('song')
            .order_by('user_id', '-played_at', '-pk')
        )
        user_ids = list(
            base_queryset
            .order_by()
            .values_list('user_id', flat=True)
            .distinct()
        )

        users_scanned = 0
        batches_scanned = 0
        duplicate_batches = 0
        duplicate_rows = 0
        deleted_rows = 0

        for user_id in user_ids:
            users_scanned += 1
            user_entries = list(queryset.filter(user_id=user_id))
            batches = _build_batches(user_entries)
            batches_scanned += len(batches)

            for batch_index in range(len(batches) - 1):
                current_batch = batches[batch_index]
                previous_batch = batches[batch_index + 1]
                overlap = _overlap_length(current_batch.keys, previous_batch.keys)
                if overlap <= 0:
                    continue

                duplicate_batches += 1
                duplicate_entries = current_batch.entries[-overlap:]
                duplicate_rows += len(duplicate_entries)
                duplicate_ids = [entry.pk for entry in duplicate_entries]

                self.stdout.write(
                    'User {user_id} batch {played_at} remove {count} overlapping rows {ids}'.format(
                        user_id=user_id,
                        played_at=current_batch.entries[0].played_at.isoformat(),
                        count=len(duplicate_entries),
                        ids=duplicate_ids,
                    )
                )

                if apply:
                    with transaction.atomic():
                        deleted_count, _ = ListeningHistory.objects.filter(pk__in=duplicate_ids).delete()
                    deleted_rows += deleted_count

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                'Scanned {users} users and {batches} Apple batches. '
                'Found {duplicate_batches} duplicate batches and {duplicate_rows} duplicate rows'
                '{deleted_suffix}.'.format(
                    users=users_scanned,
                    batches=batches_scanned,
                    duplicate_batches=duplicate_batches,
                    duplicate_rows=duplicate_rows,
                    deleted_suffix=f', deleted {deleted_rows}' if apply else '',
                )
            )
        )
