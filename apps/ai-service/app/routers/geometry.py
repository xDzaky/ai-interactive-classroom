"""
app/routers/geometry.py — P08-T02
POST /ai/geometry/solve  — deterministic geometry solver (mirrors geometry-core TS package).
No LLM involved; pure math formulas for volume and surface area.
"""
import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_internal_auth

router = APIRouter(prefix="/ai/geometry", tags=["geometry"])

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

PI = math.pi


class GeometryRequest(BaseModel):
    params: dict[str, Any]


class GeometryResult(BaseModel):
    volume: float
    surface_area: float
    formula_volume: str
    formula_surface_area: str
    label_volume: str
    label_surface_area: str


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _r(n: float, dp: int = 6) -> float:
    return round(n, dp)


def _require_positive(value: float, name: str) -> None:
    if not math.isfinite(value) or value <= 0:
        raise HTTPException(status_code=422, detail=f"{name} must be a positive finite number, got {value}")


# ---------------------------------------------------------------------------
# Solid solvers — mirrored from packages/geometry-core/src/index.ts
# ---------------------------------------------------------------------------

def _cube(params: dict[str, Any]) -> GeometryResult:
    s = float(params["s"])
    _require_positive(s, "s")
    return GeometryResult(
        volume=_r(s ** 3),
        surface_area=_r(6 * s ** 2),
        formula_volume="V = s^3",
        formula_surface_area="SA = 6s^2",
        label_volume=f"V = {s}³ = {_r(s ** 3)}",
        label_surface_area=f"SA = 6 × {s}² = {_r(6 * s ** 2)}",
    )


def _cuboid(params: dict[str, Any]) -> GeometryResult:
    l, w, h = float(params["l"]), float(params["w"]), float(params["h"])
    for name, v in [("l", l), ("w", w), ("h", h)]:
        _require_positive(v, name)
    return GeometryResult(
        volume=_r(l * w * h),
        surface_area=_r(2 * (l * w + l * h + w * h)),
        formula_volume="V = l × w × h",
        formula_surface_area="SA = 2(lw + lh + wh)",
        label_volume=f"V = {l} × {w} × {h} = {_r(l * w * h)}",
        label_surface_area=f"SA = 2({l}×{w} + {l}×{h} + {w}×{h}) = {_r(2 * (l * w + l * h + w * h))}",
    )


def _sphere(params: dict[str, Any]) -> GeometryResult:
    r = float(params["r"])
    _require_positive(r, "r")
    return GeometryResult(
        volume=_r((4 / 3) * PI * r ** 3),
        surface_area=_r(4 * PI * r ** 2),
        formula_volume="V = \\frac{4}{3}\\pi r^3",
        formula_surface_area="SA = 4\\pi r^2",
        label_volume=f"V = (4/3)π × {r}³ = {_r((4 / 3) * PI * r ** 3)}",
        label_surface_area=f"SA = 4π × {r}² = {_r(4 * PI * r ** 2)}",
    )


def _cylinder(params: dict[str, Any]) -> GeometryResult:
    r, h = float(params["r"]), float(params["h"])
    _require_positive(r, "r")
    _require_positive(h, "h")
    return GeometryResult(
        volume=_r(PI * r ** 2 * h),
        surface_area=_r(2 * PI * r * (r + h)),
        formula_volume="V = \\pi r^2 h",
        formula_surface_area="SA = 2\\pi r(r + h)",
        label_volume=f"V = π × {r}² × {h} = {_r(PI * r ** 2 * h)}",
        label_surface_area=f"SA = 2π × {r} × ({r} + {h}) = {_r(2 * PI * r * (r + h))}",
    )


def _cone(params: dict[str, Any]) -> GeometryResult:
    r, h = float(params["r"]), float(params["h"])
    _require_positive(r, "r")
    _require_positive(h, "h")
    slant = math.sqrt(r ** 2 + h ** 2)
    return GeometryResult(
        volume=_r((1 / 3) * PI * r ** 2 * h),
        surface_area=_r(PI * r * (r + slant)),
        formula_volume="V = \\frac{1}{3}\\pi r^2 h",
        formula_surface_area="SA = \\pi r(r + l), \\; l = \\sqrt{r^2+h^2}",
        label_volume=f"V = (1/3)π × {r}² × {h} = {_r((1 / 3) * PI * r ** 2 * h)}",
        label_surface_area=f"SA = π × {r} × ({r} + {_r(slant)}) = {_r(PI * r * (r + slant))}",
    )


def _pyramid(params: dict[str, Any]) -> GeometryResult:
    b, h = float(params["b"]), float(params["h"])
    _require_positive(b, "b")
    _require_positive(h, "h")
    slant = math.sqrt((b / 2) ** 2 + h ** 2)
    return GeometryResult(
        volume=_r((1 / 3) * b ** 2 * h),
        surface_area=_r(b ** 2 + 2 * b * slant),
        formula_volume="V = \\frac{1}{3}b^2 h",
        formula_surface_area="SA = b^2 + 2bl, \\; l = \\sqrt{(b/2)^2+h^2}",
        label_volume=f"V = (1/3) × {b}² × {h} = {_r((1 / 3) * b ** 2 * h)}",
        label_surface_area=f"SA = {b}² + 2 × {b} × {_r(slant)} = {_r(b ** 2 + 2 * b * slant)}",
    )


def _prism(params: dict[str, Any]) -> GeometryResult:
    a, b, c, h = float(params["a"]), float(params["b"]), float(params["c"]), float(params["h"])
    for name, v in [("a", a), ("b", b), ("c", c), ("h", h)]:
        _require_positive(v, name)
    if a + b <= c or a + c <= b or b + c <= a:
        raise HTTPException(status_code=422, detail="Triangle sides violate triangle inequality")
    s = (a + b + c) / 2
    triangle_area = math.sqrt(s * (s - a) * (s - b) * (s - c))
    vol = triangle_area * h
    sa = 2 * triangle_area + (a + b + c) * h
    return GeometryResult(
        volume=_r(vol),
        surface_area=_r(sa),
        formula_volume="V = A_{\\triangle} \\times h",
        formula_surface_area="SA = 2A_{\\triangle} + (a+b+c)h",
        label_volume=f"V = {_r(triangle_area)} × {h} = {_r(vol)}",
        label_surface_area=f"SA = 2 × {_r(triangle_area)} + ({a}+{b}+{c}) × {h} = {_r(sa)}",
    )


def _torus(params: dict[str, Any]) -> GeometryResult:
    R, r = float(params["R"]), float(params["r"])
    _require_positive(R, "R")
    _require_positive(r, "r")
    return GeometryResult(
        volume=_r(2 * PI ** 2 * R * r ** 2),
        surface_area=_r(4 * PI ** 2 * R * r),
        formula_volume="V = 2\\pi^2 R r^2",
        formula_surface_area="SA = 4\\pi^2 R r",
        label_volume=f"V = 2π² × {R} × {r}² = {_r(2 * PI ** 2 * R * r ** 2)}",
        label_surface_area=f"SA = 4π² × {R} × {r} = {_r(4 * PI ** 2 * R * r)}",
    )


_SOLVERS = {
    "cube": _cube,
    "cuboid": _cuboid,
    "sphere": _sphere,
    "cylinder": _cylinder,
    "cone": _cone,
    "pyramid": _pyramid,
    "prism": _prism,
    "torus": _torus,
}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/solve", response_model=GeometryResult)
async def solve_geometry(
    body: GeometryRequest,
    _auth: None = Depends(require_internal_auth),
) -> GeometryResult:
    """Compute volume and surface area for a 3D solid. Pure math — no LLM."""
    solid_type = body.params.get("type")
    solver = _SOLVERS.get(solid_type)  # type: ignore[arg-type]
    if solver is None:
        raise HTTPException(status_code=422, detail=f"Unknown solid type: {solid_type!r}")
    return solver(body.params)
