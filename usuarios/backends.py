from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import PermissionDenied
from .models import Usuario

class AprovacaoBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = Usuario.objects.get(username=username)
        except Usuario.DoesNotExist:
            return None

        if not user.check_password(password):
            return None

        # Superuser sempre pode logar
        if user.is_superuser:
            return user

        # Usuário não aprovado — lança exceção para diferenciar do 401
        if not user.aprovado:
            raise PermissionDenied('Conta aguardando aprovação.')

        return user