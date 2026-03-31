from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroSaudeViewSet, alertas_saude

router = DefaultRouter()
router.register(r'registros', RegistroSaudeViewSet, basename='registros-saude')

urlpatterns = [
    path('', include(router.urls)),
    path('alertas/', alertas_saude, name='alertas-saude'),
]