from rest_framework.routers import DefaultRouter
from .views import AnimalViewSet, AdocaoViewSet

router = DefaultRouter()
router.register(r'animais', AnimalViewSet)
router.register(r'adocoes', AdocaoViewSet)

urlpatterns = router.urls