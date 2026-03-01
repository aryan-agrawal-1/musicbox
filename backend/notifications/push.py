import threading
import requests
import logging

logger = logging.getLogger(__name__)
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def _send_to_expo(messages: list[dict]):
    try:
        r = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            timeout=10,
        )
        r.raise_for_status()
        for item in r.json().get('data', []):
            if item.get('status') == 'error':
                logger.warning('Expo push error: %s', item)
    except Exception as exc:
        logger.error('Expo push failed: %s', exc)


def send_push_notification(recipient_user, title: str, body: str, data: dict):
    from notifications.models import DeviceToken  # avoid circular import at module level
    tokens = list(DeviceToken.objects.filter(user=recipient_user).values_list('token', flat=True))
    if not tokens:
        return
    messages = [
        {'to': t, 'title': title, 'body': body, 'data': data, 'sound': 'default'}
        for t in tokens
    ]
    threading.Thread(target=_send_to_expo, args=(messages,), daemon=True).start()
