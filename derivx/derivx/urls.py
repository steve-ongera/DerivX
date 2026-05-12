"""
derivx/urls.py — DerivX Main URL Configuration
Root URL dispatcher including API, WebSocket, sitemap, and SPA fallback.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from django.views.generic import TemplateView
from django.http import HttpResponse

from core.sitemaps import MarketSitemap, StaticSitemap

# ── Sitemaps ──────────────────────────────────────────────────────
sitemaps = {
    "markets": MarketSitemap,
    "static": StaticSitemap,
}


def robots_txt(request):
    lines = [
        "User-agent: *",
        "Disallow: /admin/",
        "Disallow: /api/",
        f"Sitemap: {request.build_absolute_uri('/sitemap.xml')}",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # API v1
    path("api/", include("core.urls", namespace="core")),

    # SEO
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"),
    path("robots.txt", robots_txt, name="robots-txt"),

    # React SPA catch-all — must be last
    re_path(r"^(?!api/|admin/|sitemap|robots\.txt|media/|static/).*$",
            TemplateView.as_view(template_name="index.html"),
            name="spa"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)