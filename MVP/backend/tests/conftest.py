"""Pytest root configuration and fixtures."""

import os
import sys

# Ensure backend root (MVP/backend) is always first in sys.path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
