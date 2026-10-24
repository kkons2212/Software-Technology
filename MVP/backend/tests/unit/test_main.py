"""Unit tests for backend main entry point."""

import app.main


def test_main_module():
    """Verify app.main is importable and initialized."""
    assert app.main is not None
    assert app.main.__doc__ == "main.py module"
