from rest_framework import serializers
from .models import Usuario

class UsuarioPublicoSerializer(serializers.ModelSerializer):
    """Usado no cadastro público — só campos básicos, role sempre USUARIO."""
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password']
        extra_kwargs = { 'password': { 'write_only': True } }

    def create(self, validated_data):
        usuario = Usuario(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='USUARIO',   # sempre USUARIO no cadastro público
            aprovado=False,   # aguarda aprovação do admin
        )
        usuario.set_password(validated_data['password'])
        usuario.save()
        return usuario


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Usado pelo admin para listar e gerenciar usuários."""
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'aprovado', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'date_joined']