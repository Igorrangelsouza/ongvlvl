from rest_framework import serializers
from .models import Conta, Pagamento
from datetime import date


class PagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = '__all__'


class ContaSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    status_display    = serializers.CharField(source='get_status_display',    read_only=True)
    pagamento         = PagamentoSerializer(read_only=True)
    dias_vencimento   = serializers.SerializerMethodField()

    class Meta:
        model = Conta
        fields = '__all__'

    def get_dias_vencimento(self, obj):
        return (obj.vencimento - date.today()).days