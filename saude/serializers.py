from rest_framework import serializers
from .models import RegistroSaude
from animais.models import Animal
from datetime import date, timedelta


class RegistroSaudeSerializer(serializers.ModelSerializer):
    animal_nome = serializers.CharField(source='animal.nome', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_dose = serializers.SerializerMethodField()

    class Meta:
        model = RegistroSaude
        fields = '__all__'

    def get_status_dose(self, obj):
        hoje = date.today()

        if not obj.proxima_dose:
            if obj.data_aplicacao <= hoje:
                return 'APLICADO'
            return 'SEM_RECORRENCIA'

        # Próxima dose vencida
        if obj.proxima_dose < hoje:
            return 'VENCIDA'

        # Próxima dose vencendo em 30 dias
        if obj.proxima_dose <= hoje + timedelta(days=30):
            # Verifica se é o registro mais recente desse tipo para esse animal
            mais_recente = RegistroSaude.objects.filter(
                animal=obj.animal,
                tipo=obj.tipo
            ).order_by('-data_aplicacao').first()

            if mais_recente and mais_recente.id == obj.id:
                return 'VENCENDO'
            return 'APLICADO'

        # Próxima dose futura (+30 dias)
        mais_recente = RegistroSaude.objects.filter(
            animal=obj.animal,
            tipo=obj.tipo
        ).order_by('-data_aplicacao').first()

        if mais_recente and mais_recente.id == obj.id:
            return 'EM_DIA'
        return 'APLICADO'


class AlertaSerializer(serializers.Serializer):
    animal_id = serializers.IntegerField()
    animal_nome = serializers.CharField()
    animal_foto_url = serializers.CharField(allow_null=True)
    tipo = serializers.CharField()
    tipo_display = serializers.CharField()
    proxima_dose = serializers.DateField()
    status = serializers.CharField()
    dias_restantes = serializers.IntegerField()