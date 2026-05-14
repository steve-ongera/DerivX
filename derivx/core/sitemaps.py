# core/sitemaps.py
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Market


class MarketSitemap(Sitemap):
    """
    Generates sitemap entries for all active market detail pages.
    e.g. /markets/volatility-100-index/
    """
    changefreq = "hourly"
    priority    = 0.9
    protocol    = "https"

    def items(self):
        return Market.objects.filter(is_active=True).order_by("-is_featured", "name")

    def location(self, obj):
        return f"/markets/{obj.slug}/"

    def lastmod(self, obj):
        return obj.updated_at


class StaticSitemap(Sitemap):
    """
    Sitemap entries for static React SPA pages.
    """
    changefreq = "weekly"
    priority    = 0.8
    protocol    = "https"

    STATIC_PAGES = [
        ("/",        1.0,  "daily"),
        ("/markets", 0.9,  "hourly"),
        ("/login",   0.5,  "monthly"),
        ("/register",0.6,  "monthly"),
    ]

    def items(self):
        return self.STATIC_PAGES

    def location(self, item):
        return item[0]

    def priority(self, item):
        return item[1]

    def changefreq(self, item):
        return item[2]