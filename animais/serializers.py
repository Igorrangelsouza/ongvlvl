from rest_framework import serializers
from .models import Animal, Adocao

class AdocaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Adocao
        fields = '__all__'

class AnimalSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model = Animal
        fields = '__all__'

    def get_foto_url(self, obj):
        if obj.foto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.foto.url)
        return None