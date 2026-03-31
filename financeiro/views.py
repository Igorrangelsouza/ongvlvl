from rest_framework import viewsets, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from datetime import date
import csv

from .models import Conta, Pagamento
from .serializers import ContaSerializer, PagamentoSerializer
from animais.models import Animal


class ContaViewSet(viewsets.ModelViewSet):
    """CRUD completo de contas."""

    queryset = Conta.objects.all()
    serializer_class = ContaSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "categoria"]
    search_fields = ["descricao", "fornecedor"]
    ordering_fields = ["vencimento", "valor", "criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Atualiza vencidos automaticamente
        qs.filter(status="PENDENTE", vencimento__lt=date.today()).update(
            status="VENCIDO"
        )

        # Filtro por período
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if data_inicio:
            qs = qs.filter(vencimento__gte=data_inicio)
        if data_fim:
            qs = qs.filter(vencimento__lte=data_fim)
        return qs


class PagamentoViewSet(viewsets.ModelViewSet):
    """CRUD de pagamentos."""

    queryset = Pagamento.objects.select_related("conta").all()
    serializer_class = PagamentoSerializer


@extend_schema(summary="Resumo financeiro mensal")
@api_view(["GET"])
def resumo_financeiro(request):
    """Retorna total pago, pendente, vencido e contas por mês."""
    hoje = date.today()

    # Atualiza vencidos
    Conta.objects.filter(status="PENDENTE", vencimento__lt=hoje).update(
        status="VENCIDO"
    )

    total_pago = Conta.objects.filter(status="PAGO").aggregate(t=Sum("valor"))["t"] or 0
    total_pendente = (
        Conta.objects.filter(status="PENDENTE").aggregate(t=Sum("valor"))["t"] or 0
    )
    total_vencido = (
        Conta.objects.filter(status="VENCIDO").aggregate(t=Sum("valor"))["t"] or 0
    )
    qtd_vencidas = Conta.objects.filter(status="VENCIDO").count()

    # Contas por mês (últimos 6 meses)
    from django.db.models.functions import TruncMonth

    por_mes = (
        Conta.objects.annotate(mes=TruncMonth("vencimento"))
        .values("mes", "status")
        .annotate(total=Sum("valor"), quantidade=Count("id"))
        .order_by("mes")
    )

    meses = {}
    for item in por_mes:
        chave = item["mes"].strftime("%Y-%m") if item["mes"] else "N/A"
        if chave not in meses:
            meses[chave] = {"mes": chave, "pago": 0, "pendente": 0, "vencido": 0}
        meses[chave][item["status"].lower()] += float(item["total"] or 0)

    return Response(
        {
            "total_pago": float(total_pago),
            "total_pendente": float(total_pendente),
            "total_vencido": float(total_vencido),
            "qtd_vencidas": qtd_vencidas,
            "por_mes": list(meses.values()),
        }
    )


@api_view(["GET"])
def exportar_contas_csv(request):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="contas.csv"'
    response.write("\ufeff")

    writer = csv.writer(response, delimiter=";")

    writer.writerow(
        [
            "ID",
            "Descrição",
            "Fornecedor",
            "Categoria",
            "Valor (R$)",
            "Vencimento",
            "Status",
            "Data Pagamento",
            "Valor Pago (R$)",
            "Observações",
        ]
    )

    contas = Conta.objects.select_related("pagamento").all().order_by("vencimento")

    for conta in contas:
        pagamento = getattr(conta, "pagamento", None)
        writer.writerow(
            [
                f"#VL-{str(conta.id).zfill(3)}",
                conta.descricao,
                conta.fornecedor or "—",
                conta.get_categoria_display(),
                str(conta.valor).replace(".", ","),
                conta.vencimento.strftime("%d/%m/%Y"),
                conta.get_status_display(),
                pagamento.data_pagamento.strftime("%d/%m/%Y") if pagamento else "—",
                str(pagamento.valor_pago).replace(".", ",") if pagamento else "—",
                conta.observacoes or "—",
            ]
        )

    return response


@api_view(["GET"])
def exportar_animais_csv(request):
    """Exporta todos os animais para CSV."""
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="animais.csv"'
    response.write("\ufeff")

    writer = csv.writer(response)
    writer.writerow(["ID", "Nome", "Raça", "Sexo", "Porte", "Status", "Castrado"])

    SEXO = {"M": "Macho", "F": "Fêmea"}
    PORTE = {"PEQUENO": "Pequeno", "MEDIO": "Médio", "GRANDE": "Grande"}
    STATUS = {
        "NO_ABRIGO": "No Abrigo",
        "ADOTADO": "Adotado",
        "FALECIDO": "Falecido",
        "DESAPARECIDO": "Desaparecido",
        "LT": "Lar Temporário",
    }

    for animal in Animal.objects.all().order_by("nome"):
        writer.writerow(
            [
                f"VL-{str(animal.id).zfill(3)}",
                animal.nome,
                animal.raca or "",
                SEXO.get(animal.sexo, animal.sexo),
                PORTE.get(animal.porte, animal.porte),
                STATUS.get(animal.status, animal.status),
                "Sim" if getattr(animal, "castrado", False) else "Não",
            ]
        )
    return response
