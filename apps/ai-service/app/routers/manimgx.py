"""ManimGX 3D Mathematical Animation Router (V6 — academa-labs/manimgx)."""
from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.manimgx_sandbox import validate_manimgx_code

router = APIRouter(prefix="/api/manimgx", tags=["manimgx"])


class ManimGxGenerateRequest(BaseModel):
    latex: str = Field(default="", description="Source LaTeX math formula")
    prompt: str = Field(default="", description="Optional Indonesian/English teaching prompt")
    quality: Literal["l", "m", "h"] = Field(default="m", description="Render quality preset")


class ManimGxGenerateResponse(BaseModel):
    template_id: str
    title: str
    scene_code: str
    validated: bool
    violations: list[str]
    runtime_hint: Literal["browser_webgpu", "procedural_canvas", "server_mp4"]


class ManimGxRenderRequest(BaseModel):
    scene_code: str = Field(..., min_length=10)
    quality: Literal["l", "m", "h"] = Field(default="m")


class ManimGxRenderResponse(BaseModel):
    status: Literal["validated_ready", "rejected"]
    scene_classes: list[str]
    quality: str
    runtime_hint: Literal["browser_webgpu", "procedural_canvas", "server_mp4"]


def _choose_template(latex: str, prompt: str) -> tuple[str, str, str]:
    combined = f"{latex} {prompt}".lower()
    safe_label = re.sub(r"[^a-zA-Z0-9^_+\-*/=().\\ ]", "", latex or prompt)[:48] or "f(x) = x^2"

    if re.search(r"z\s*=|f\s*\(\s*x\s*,\s*y\s*\)|surface|permukaan", combined):
        code = f'''from manimgx import Scene, ThreeDAxes, Surface, FadeIn
import math

class Surface3DScene(Scene):
    def construct(self):
        axes = ThreeDAxes(x_range=[-3, 3, 1], y_range=[-3, 3, 1], z_range=[-2, 2, 1])
        surface = Surface(
            lambda u, v: (u, v, math.sin(u) * math.cos(v)),
            u_range=[-2.5, 2.5],
            v_range=[-2.5, 2.5],
        )
        self.play(FadeIn(axes), FadeIn(surface))
'''
        return "surface_3d", f"Animasi Permukaan 3D: {safe_label}", code

    if re.search(r"matrix|matriks|transform|vektor|vector|eigen", combined):
        code = '''from manimgx import Scene, NumberPlane, Vector, ApplyMatrix

class LinearTransformScene(Scene):
    def construct(self):
        plane = NumberPlane()
        v1 = Vector([1, 0])
        v2 = Vector([0, 1])
        self.play(ApplyMatrix([[1.4, 0.7], [-0.3, 1.2]], plane))
'''
        return "linear_transform", f"Transformasi Linear: {safe_label}", code

    if re.search(r"kubus|balok|tabung|kerucut|bola|limas|prisma|cube|sphere|cone", combined):
        code = '''from manimgx import Scene, Cube, Rotate

class Solid3DScene(Scene):
    def construct(self):
        solid = Cube(side_length=2.2)
        self.play(Rotate(solid, angle=3.14159))
'''
        return "solid_3d", f"Animasi Bangun Ruang 3D: {safe_label}", code

    code = f'''from manimgx import Scene, Axes, Create
import math

class CalculusFunctionScene(Scene):
    def construct(self):
        axes = Axes(x_range=[-4, 4, 1], y_range=[-3, 5, 1])
        graph = axes.plot(lambda x: math.sin(x) if "sin" in "{safe_label}" else 0.3 * x * x)
        self.play(Create(axes), Create(graph))
'''
    return "function_calculus", f"Animasi Fungsi & Kalkulus: {safe_label}", code


@router.post("/generate", response_model=ManimGxGenerateResponse)
async def generate_manimgx_scene(req: ManimGxGenerateRequest) -> ManimGxGenerateResponse:
    """Generate and AST-validate a ManimGX Python scene from LaTeX or prompt."""
    template_id, title, code = _choose_template(req.latex, req.prompt)
    validation = validate_manimgx_code(code)
    return ManimGxGenerateResponse(
        template_id=template_id,
        title=title,
        scene_code=code,
        validated=validation.valid,
        violations=validation.violations,
        runtime_hint="procedural_canvas",
    )


@router.post("/render", response_model=ManimGxRenderResponse)
async def render_manimgx_scene(req: ManimGxRenderRequest) -> ManimGxRenderResponse:
    """Validate ManimGX Python code against the AST security sandbox before rendering."""
    validation = validate_manimgx_code(req.scene_code)
    if not validation.valid:
        raise HTTPException(
            status_code=400,
            detail={"message": "ManimGX sandbox violation", "violations": validation.violations},
        )
    return ManimGxRenderResponse(
        status="validated_ready",
        scene_classes=validation.scene_classes,
        quality=req.quality,
        runtime_hint="procedural_canvas",
    )
