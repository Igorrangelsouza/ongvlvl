from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContaViewSet, PagamentoViewSet, resumo_financeiro, exportar_contas_csv, exportar_animais_csv

router = DefaultRouter()
router.register(r'contas',    ContaViewSet,    basename='contas')
router.register(r'pagamentos', PagamentoViewSet, basename='pagamentos')

urlpatterns = [
    path('', include(router.urls)),
    path('resumo/',              resumo_financeiro,    name='resumo-financeiro'),
    path('export/contas/',       exportar_contas_csv,  name='export-contas'),
    path('export/animais/',      exportar_animais_csv, name='export-animais'),
]