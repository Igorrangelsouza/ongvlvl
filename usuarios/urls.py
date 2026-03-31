from django.urls import path
from .views import criar_usuario, listar_usuarios, atualizar_usuario, deletar_usuario

urlpatterns = [
    path('cadastrar/',       criar_usuario,    name='criar-usuario'),
    path('',                 listar_usuarios,  name='listar-usuarios'),
    path('<int:pk>/',        atualizar_usuario, name='atualizar-usuario'),
    path('<int:pk>/deletar/', deletar_usuario,  name='deletar-usuario'),
]