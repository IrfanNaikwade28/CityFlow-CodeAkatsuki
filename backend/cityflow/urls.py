from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/issues/', include('issues.urls')),
    path('api/bins/', include('bins.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ai/', include('ai.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
