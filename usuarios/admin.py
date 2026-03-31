from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display  = ['username', 'email', 'role', 'aprovado', 'is_active']
    list_filter   = ['role', 'aprovado', 'is_active']
    list_editable = ['role', 'aprovado', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Permissões ONG', {'fields': ('role', 'aprovado')}),
    )