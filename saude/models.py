from django.db import models
from animais.models import Animal
from datetime import date, timedelta


class RegistroSaude(models.Model):
    TIPO_CHOICES = [
        ('ANTIRABICA', 'Vacina Antirrábica'),
        ('V10', 'Vacina V10'),
        ('OUTRA_VACINA', 'Outra Vacina'),
        ('VERMIFUGO', 'Vermífugo'),
        ('CARRAPATICIDA', 'Carrapaticida'),
    ]

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name='registros_saude')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    nome_produto = models.CharField(max_length=100, blank=True, default='')
    data_aplicacao = models.DateField()
    proxima_dose = models.DateField(null=True, blank=True)
    observacoes = models.TextField(blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_aplicacao']

    def save(self, *args, **kwargs):
        # Calcula próxima dose automaticamente se não informada
        if not self.proxima_dose:
            if self.tipo == 'ANTIRABICA':
                self.proxima_dose = self.data_aplicacao + timedelta(days=365)
            elif self.tipo == 'VERMIFUGO':
                self.proxima_dose = self.data_aplicacao + timedelta(days=120)
            elif self.tipo == 'CARRAPATICIDA':
                self.proxima_dose = self.data_aplicacao + timedelta(days=90)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.animal.nome} — {self.get_tipo_display()} em {self.data_aplicacao}'