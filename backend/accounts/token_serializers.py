from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from rest_framework import serializers


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that allows login with username or email
    """
    username_field = 'username'  # This will actually accept username OR email

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Update the help text to reflect that both username and email work
        self.fields[self.username_field].help_text = 'Username or email address'

    def validate(self, attrs):
        # Get the credentials
        username = attrs.get(self.username_field)
        password = attrs.get('password')

        if username and password:
            # Use our custom authentication backend
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    'No active account found with the given credentials',
                    code='authorization'
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )

            # Generate tokens
            refresh = self.get_token(user)

            data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }

            return data
        else:
            raise serializers.ValidationError(
                'Must include "username" and "password".',
                code='authorization'
            )
