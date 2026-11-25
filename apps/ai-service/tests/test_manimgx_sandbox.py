"""Unit tests for ManimGX AST security sandbox & FastAPI router (V6)."""
from fastapi.testclient import TestClient

from main import app
from app.services.manimgx_sandbox import validate_manimgx_code

client = TestClient(app)


SAFE_SCENE = """
from manimgx import Scene, Axes, Create
import math

class ParabolaScene(Scene):
    def construct(self):
        axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 9, 1])
        graph = axes.plot(lambda x: x * x + math.sin(x))
        self.play(Create(axes), Create(graph))
"""


def test_safe_manimgx_scene_passes_sandbox() -> None:
    res = validate_manimgx_code(SAFE_SCENE)
    assert res.valid is True
    assert res.violations == []
    assert "ParabolaScene" in res.scene_classes


def test_forbidden_imports_blocked() -> None:
    bad = """
import os
import subprocess
from manimgx import Scene

class BadScene(Scene):
    def construct(self):
        os.system("ls")
"""
    res = validate_manimgx_code(bad)
    assert res.valid is False
    assert any("Forbidden import: 'os'" in v for v in res.violations)
    assert any("Forbidden import: 'subprocess'" in v for v in res.violations)


def test_forbidden_builtins_and_dunders_blocked() -> None:
    bad = """
from manimgx import Scene

class BadScene(Scene):
    def construct(self):
        x = eval("1+1")
        f = open("/etc/passwd")
        cls = ().__class__.__bases__
"""
    res = validate_manimgx_code(bad)
    assert res.valid is False
    assert any("eval()" in v for v in res.violations)
    assert any("open()" in v for v in res.violations)
    assert any("__class__" in v for v in res.violations)


def test_manimgx_generate_and_render_endpoints() -> None:
    gen = client.post("/api/manimgx/generate", json={"latex": "z = sin(x) * cos(y)"})
    assert gen.status_code == 200
    body = gen.json()
    assert body["template_id"] == "surface_3d"
    assert body["validated"] is True
    assert "class Surface3DScene(Scene)" in body["scene_code"]

    ok = client.post("/api/manimgx/render", json={"scene_code": body["scene_code"], "quality": "m"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "validated_ready"

    blocked = client.post(
        "/api/manimgx/render",
        json={"scene_code": "import os\nclass X(Scene):\n  def construct(self): pass", "quality": "l"},
    )
    assert blocked.status_code == 400
