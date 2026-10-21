"""
Compatibility wrapper for /api/events -> redirecting to products_bp logic.
"""
from .products import events_bp

__all__ = ["events_bp"]
