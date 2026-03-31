from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Animal, Adocao
from .serializers import AnimalSerializer, AdocaoSerializer

class AnimalViewSet(viewsets.ModelViewSet):
    queryset = Animal.objects.all()
    serializer_class = AnimalSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'sexo', 'porte', 'castrado']
    search_fields = ['nome']
    ordering_fields = ['nome', 'criado_em']

    def get_serializer_context(self):
        return {'request': self.request}

class AdocaoViewSet(viewsets.ModelViewSet):
    queryset = Adocao.objects.all()
    serializer_class = AdocaoSerializer