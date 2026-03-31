import pytest
from model_bakery import baker
from animais.models import Animal, Adocao


@pytest.mark.django_db
class TestAnimalModel:

    def test_criar_animal_com_campos_minimos(self):
        animal = Animal.objects.create(nome="Rex")
        assert animal.id is not None
        assert animal.nome == "Rex"
        assert animal.status == Animal.Status.NO_ABRIGO
        assert animal.castrado is False

    def test_status_padrao_e_no_abrigo(self):
        animal = baker.make(Animal)
        assert animal.status == Animal.Status.NO_ABRIGO

    def test_str_retorna_nome(self):
        animal = baker.make(Animal, nome="Bolinha")
        assert str(animal) == "Bolinha"

    def test_atualizado_em_muda_ao_editar(self):
        animal = baker.make(Animal, nome="Fido")
        criado = animal.atualizado_em
        animal.nome = "Fido Atualizado"
        animal.save()
        assert animal.atualizado_em >= criado


@pytest.mark.django_db
class TestAdocaoModel:

    def test_criar_adocao(self):
        animal = baker.make(Animal)
        adocao = Adocao.objects.create(
            animal=animal,
            nome_adotante="João Silva",
            data_adocao="2026-01-15"
        )
        assert adocao.id is not None
        assert adocao.nome_adotante == "João Silva"

    def test_adocao_str(self):
        animal = baker.make(Animal, nome="Mel")
        adocao = baker.make(Adocao, animal=animal, nome_adotante="Maria")
        assert "Mel" in str(adocao)
        assert "Maria" in str(adocao)

    def test_animal_so_pode_ter_uma_adocao(self):
        animal = baker.make(Animal)
        baker.make(Adocao, animal=animal)
        with pytest.raises(Exception):
            baker.make(Adocao, animal=animal)