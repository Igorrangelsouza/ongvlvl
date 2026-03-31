from django.db import models
from datetime import date


class Conta(models.Model):
    CATEGORIA_CHOICES = [
        ('ALIMENTACAO',  'Alimentação'),
        ('VETERINARIO',  'Veterinário'),
        ('MEDICAMENTO',  'Medicamento'),
        ('HIGIENE',      'Higiene'),
        ('INFRAESTRUTURA', 'Infraestrutura'),
        ('TRANSPORTE',   'Transporte'),
        ('OUTROS',       'Outros'),
    ]
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('PAGO',     'Pago'),
        ('VENCIDO',  'Vencido'),
    ]

    descricao   = models.CharField(max_length=200)
    fornecedor  = models.CharField(max_length=200, blank=True, default='')
    categoria   = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='OUTROS')
    valor       = models.DecimalField(max_digits=10, decimal_places=2)
    vencimento  = models.DateField()
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDENTE')
    observacoes = models.TextField(blank=True, default='')
    criado_em   = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['vencimento']

    def save(self, *args, **kwargs):
        # Atualiza status para VENCIDO automaticamente
        if self.status == 'PENDENTE' and self.vencimento < date.today():
            self.status = 'VENCIDO'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.descricao} — R$ {self.valor}'


class Pagamento(models.Model):
    conta          = models.OneToOneField(Conta, on_delete=models.CASCADE, related_name='pagamento')
    data_pagamento = models.DateField()
    valor_pago     = models.DecimalField(max_digits=10, decimal_places=2)
    observacoes    = models.TextField(blank=True, default='')
    criado_em      = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Marca a conta como PAGO ao registrar pagamento
        self.conta.status = 'PAGO'
        self.conta.save()

    def __str__(self):
        return f'Pagamento de {self.conta.descricao} em {self.data_pagamento}'