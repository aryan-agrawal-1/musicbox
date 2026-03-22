from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD_RESET_REQUEST_URL = '/api/v1/auth/password-reset/request/'
PASSWORD_RESET_CONFIRM_URL = '/api/v1/auth/password-reset/confirm/'
TOKEN_URL = '/api/v1/token/'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pwuser',
            email='pwuser@example.com',
            password='OriginalPassw0rd!',
        )

    def test_request_existing_email_sends_mail_generic_response(self):
        mail.outbox.clear()
        r = self.client.post(
            PASSWORD_RESET_REQUEST_URL,
            {'email': 'pwuser@example.com'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            r.data['detail'],
            'If an account exists for this email, you will receive a password reset link shortly.',
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reset', mail.outbox[0].body.lower())

    def test_request_unknown_email_same_response_no_mail(self):
        mail.outbox.clear()
        r = self.client.post(
            PASSWORD_RESET_REQUEST_URL,
            {'email': 'nobody@example.com'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            r.data['detail'],
            'If an account exists for this email, you will receive a password reset link shortly.',
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_request_apple_only_no_mail_generic_response(self):
        apple_user = User.objects.create_user(
            username='appleonly',
            email='appleonly@example.com',
            password='unused',
        )
        apple_user.set_unusable_password()
        apple_user.apple_user_id = 'apple.sub.123'
        apple_user.save()

        mail.outbox.clear()
        r = self.client.post(
            PASSWORD_RESET_REQUEST_URL,
            {'email': 'appleonly@example.com'},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_resets_password_and_invalidates_refresh_tokens(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        if isinstance(uid, bytes):
            uid = uid.decode()
        token = default_token_generator.make_token(self.user)

        refresh_r = self.client.post(
            TOKEN_URL,
            {'username': 'pwuser@example.com', 'password': 'OriginalPassw0rd!'},
            format='json',
        )
        self.assertEqual(refresh_r.status_code, status.HTTP_200_OK)
        old_refresh = refresh_r.data['refresh']

        r = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                'uid': uid,
                'token': token,
                'new_password': 'BrandNewPassw0rd!',
                'new_password_confirm': 'BrandNewPassw0rd!',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPassw0rd!'))

        refresh_again = self.client.post(
            '/api/v1/token/refresh/',
            {'refresh': old_refresh},
            format='json',
        )
        self.assertEqual(refresh_again.status_code, status.HTTP_401_UNAUTHORIZED)

        login_r = self.client.post(
            TOKEN_URL,
            {'username': 'pwuser@example.com', 'password': 'BrandNewPassw0rd!'},
            format='json',
        )
        self.assertEqual(login_r.status_code, status.HTTP_200_OK)

    def test_confirm_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        if isinstance(uid, bytes):
            uid = uid.decode()
        r = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                'uid': uid,
                'token': 'invalid-token',
                'new_password': 'BrandNewPassw0rd!',
                'new_password_confirm': 'BrandNewPassw0rd!',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', r.data)

    def test_confirm_apple_only_user_rejected(self):
        apple_user = User.objects.create_user(
            username='appleonly2',
            email='appleonly2@example.com',
            password='unused',
        )
        apple_user.set_unusable_password()
        apple_user.apple_user_id = 'apple.sub.456'
        apple_user.save()

        uid = urlsafe_base64_encode(force_bytes(apple_user.pk))
        if isinstance(uid, bytes):
            uid = uid.decode()
        tok = default_token_generator.make_token(apple_user)

        r = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                'uid': uid,
                'token': tok,
                'new_password': 'BrandNewPassw0rd!',
                'new_password_confirm': 'BrandNewPassw0rd!',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', r.data)

    def test_confirm_password_mismatch(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        if isinstance(uid, bytes):
            uid = uid.decode()
        tok = default_token_generator.make_token(self.user)
        r = self.client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                'uid': uid,
                'token': tok,
                'new_password': 'BrandNewPassw0rd!',
                'new_password_confirm': 'DifferentPassw0rd!',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password_confirm', r.data)
