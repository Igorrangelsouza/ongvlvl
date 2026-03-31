from django.contrib import admin
from .models import RegistroSaude

@admin.register(RegistroSaude)
class RegistroSaudeAdmin(admin.ModelAdmin):
    list_display = ['animal', 'tipo', 'data_aplicacao', 'proxima_dose']
    list_filter = ['tipo']
    search_fields = ['animal__nome']