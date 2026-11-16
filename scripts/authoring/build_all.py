#!/usr/bin/env python3
"""Regenera as questões escritas em scripts/authoring/unit_*.py.

As três questões de amostra da spec 002 (gift-card-pair, balanced-brackets,
rewind-the-playlist) foram escritas à mão e não passam por aqui.

Uso: python3 scripts/authoring/build_all.py
"""

import runpy
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

for unit in sorted(HERE.glob("unit_*.py")):
    print(f"--- {unit.name}")
    runpy.run_path(str(unit), run_name="__main__")
