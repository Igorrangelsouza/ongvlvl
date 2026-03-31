from django.contrib import admin
from .models import Conta, Pagamento

@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display  = ['descricao', 'categoria', 'valor', 'vencimento', 'status']
    list_filter   = ['status', 'categoria']
    search_fields = ['descricao', 'fornecedor']

@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = ['conta', 'data_pagamento', 'valor_pago']