import { ApiError } from '@/lib/api';

/**
 * Pull the first useful message from a DRF-style error body.
 */
export function extractApiError(error: unknown, fields: string[]): string {
  if (error instanceof ApiError && error.data) {
    const d = error.data as Record<string, unknown>;
    for (const field of fields) {
      const msgs = d[field];
      if (Array.isArray(msgs) && msgs.length > 0) return String(msgs[0]);
      if (typeof msgs === 'string') return msgs;
    }
    if (typeof d.detail === 'string') return d.detail;
    if (Array.isArray(d.non_field_errors) && d.non_field_errors.length > 0) {
      return String(d.non_field_errors[0]);
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
