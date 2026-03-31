from django.db import models


class Animal(models.Model):

    class Sexo(models.TextChoices):
        MACHO = "M", "Macho"
        FEMEA = "F", "Fêmea"

    class Porte(models.TextChoices):
        PEQUENO = "PEQUENO", "Pequeno"
        MEDIO   = "MEDIO",   "Médio"
        GRANDE  = "GRANDE",  "Grande"

    class Status(models.TextChoices):
        NO_ABRIGO    = "NO_ABRIGO",    "No Abrigo"
        ADOTADO      = "ADOTADO",      "Adotado"
        FALECIDO     = "FALECIDO",     "Falecido"
        DESAPARECIDO = "DESAPARECIDO", "Desaparecido"
        LT           = "LT",           "Lar Temporário"

    nome            = models.CharField(max_length=150)
    sexo            = models.CharField(max_length=1, choices=Sexo.choices, null=True, blank=True)
    porte           = models.CharField(max_length=10, choices=Porte.choices, null=True, blank=True)
    data_nascimento = models.DateField(null=True, blank=True)
    castrado        = models.BooleanField(default=False)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.NO_ABRIGO)
    observacoes     = models.TextField(blank=True, default="")
    criado_em       = models.DateTimeField(auto_now_add=True)
    atualizado_em   = models.DateTimeField(auto_now=True)
    aparencia       = models.TextField(blank=True, default="")
    comportamento   = models.TextField(blank=True, default="")
    foto            = models.ImageField(upload_to='animais/', null=True, blank=True)

    

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Adocao(models.Model):
    animal                     = models.OneToOneField(Animal, on_delete=models.RESTRICT, related_name="adocao")
    nome_adotante              = models.CharField(max_length=150)
    telefone_adotante          = models.CharField(max_length=30, blank=True, default="")
    data_adocao                = models.DateField()
    responsavel_acompanhamento = models.CharField(max_length=150, blank=True, default="")
    ultimo_acompanhamento      = models.DateField(null=True, blank=True)
    castrado_pos_adocao        = models.BooleanField(default=False)
    observacoes                = models.TextField(blank=True, default="")
    criado_em                  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Adoção de {self.animal.nome} por {self.nome_adotante}"