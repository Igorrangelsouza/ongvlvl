from rest_framework import viewsets, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Max
from datetime import date, timedelta
from drf_spectacular.utils import extend_schema

from .models import RegistroSaude
from .serializers import RegistroSaudeSerializer, AlertaSerializer


class RegistroSaudeViewSet(viewsets.ModelViewSet):
    """CRUD completo de registros de saúde por animal."""

    queryset = RegistroSaude.objects.select_related("animal").all()
    serializer_class = RegistroSaudeSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["animal", "tipo"]
    search_fields = ["animal__nome", "nome_produto"]
    ordering_fields = ["data_aplicacao", "proxima_dose"]


@extend_schema(
    summary="Alertas de saúde",
    description="Retorna animais com doses vencidas ou vencendo nos próximos 30 dias.",
    responses={200: AlertaSerializer(many=True)},
)
@api_view(["GET"])
def alertas_saude(request):
    """Endpoint de alertas: doses vencidas ou vencendo em 30 dias."""
    hoje = date.today()
    limite = hoje + timedelta(days=30)

    registros = RegistroSaude.objects.select_related('animal').filter(
        proxima_dose__isnull=False,
        proxima_dose__lte=limite,
    ).order_by('proxima_dose')

    # Remove registros onde já existe aplicação mais recente do mesmo tipo para o mesmo animal
    animais_com_registro_recente = set()
    alertas_filtrados = []
    for r in registros:
        chave = (r.animal_id, r.tipo)
        mais_recente = RegistroSaude.objects.filter(
            animal=r.animal, tipo=r.tipo
        ).order_by('-data_aplicacao').first()
        if mais_recente and mais_recente.id == r.id and chave not in animais_com_registro_recente:
            animais_com_registro_recente.add(chave)
            alertas_filtrados.append(r)

    registros = alertas_filtrados

    alertas = []
    for r in registros:
        dias = (r.proxima_dose - hoje).days
        status = "VENCIDA" if r.proxima_dose < hoje else "VENCENDO"
        foto_url = None
        if r.animal.foto:
            foto_url = request.build_absolute_uri(r.animal.foto.url)

        alertas.append(
            {
                "animal_id": r.animal.id,
                "animal_nome": r.animal.nome,
                "animal_foto_url": foto_url,
                "tipo": r.tipo,
                "tipo_display": r.get_tipo_display(),
                "proxima_dose": r.proxima_dose,
                "status": status,
                "dias_restantes": dias,
            }
        )

    serializer = AlertaSerializer(alertas, many=True)
    return Response(serializer.data)