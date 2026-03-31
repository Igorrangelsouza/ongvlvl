from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrador'),
        ('USUARIO', 'Usuário'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USUARIO')
    aprovado = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'