from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Usuario
from .serializers import UsuarioPublicoSerializer, UsuarioAdminSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.core.exceptions import PermissionDenied


def is_admin(user):
    return user.is_authenticated and (user.role == 'ADMIN' or user.is_superuser)


@api_view(['POST'])
@permission_classes([AllowAny])
def criar_usuario(request):
    """Cadastro público — cria usuário com role USUARIO e aprovado=False."""
    serializer = UsuarioPublicoSerializer(data=request.data)
    if serializer.is_valid():
        if Usuario.objects.filter(username=request.data.get('username')).exists():
            return Response({'erro': 'Usuário já existe.'}, status=400)
        serializer.save()
        return Response(
            {'mensagem': 'Conta criada! Aguarde a aprovação do administrador.'},
            status=201
        )
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_usuarios(request):
    """Somente admin pode listar usuários."""
    if not is_admin(request.user):
        return Response({'erro': 'Acesso negado.'}, status=403)
    usuarios = Usuario.objects.all().order_by('-date_joined')
    serializer = UsuarioAdminSerializer(usuarios, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def atualizar_usuario(request, pk):
    """Somente admin pode alterar role e aprovação."""
    if not is_admin(request.user):
        return Response({'erro': 'Acesso negado.'}, status=403)
    try:
        usuario = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({'erro': 'Usuário não encontrado.'}, status=404)

    serializer = UsuarioAdminSerializer(usuario, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deletar_usuario(request, pk):
    """Somente admin pode deletar usuários."""
    if not is_admin(request.user):
        return Response({'erro': 'Acesso negado.'}, status=403)
    try:
        usuario = Usuario.objects.get(pk=pk)
        usuario.delete()
        return Response({'mensagem': 'Usuário removido.'})
    except Usuario.DoesNotExist:
        return Response({'erro': 'Usuário não encontrado.'}, status=404)
    