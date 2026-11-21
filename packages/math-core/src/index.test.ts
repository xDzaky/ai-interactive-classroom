import { describe, it, expect } from "vitest";
import {
  parseExpression,
  evaluateAST,
  safeEvaluate,
  parseMathLiveLatex,
  ParseError,
  EvaluationError,
  ALLOWED_FUNCTIONS,
} from "./index.js";

// ─── parseExpression ──────────────────────────────────────────────────────────

describe("parseExpression", () => {
  it("parses a simple number", () => {
    const ast = parseExpression("42");
    expect(ast).toEqual({ type: "number", value: 42 });
  });

  it("parses a decimal number", () => {
    const ast = parseExpression("3.14");
    expect(ast).toMatchObject({ type: "number" });
    expect((ast as { value: number }).value).toBeCloseTo(3.14);
  });

  it("parses a variable", () => {
    const ast = parseExpression("x");
    expect(ast).toEqual({ type: "variable", name: "x" });
  });

  it("parses addition", () => {
    const ast = parseExpression("1+2");
    expect(ast).toEqual({ type: "binary", op: "+", left: { type: "number", value: 1 }, right: { type: "number", value: 2 } });
  });

  it("parses subtraction", () => {
    const ast = parseExpression("5-3");
    expect(ast).toMatchObject({ type: "binary", op: "-" });
  });

  it("parses multiplication", () => {
    const ast = parseExpression("2*3");
    expect(ast).toMatchObject({ type: "binary", op: "*" });
  });

  it("parses division", () => {
    const ast = parseExpression("6/2");
    expect(ast).toMatchObject({ type: "binary", op: "/" });
  });

  it("parses power", () => {
    const ast = parseExpression("2^3");
    expect(ast).toMatchObject({ type: "binary", op: "^" });
  });

  it("parses unary minus", () => {
    const ast = parseExpression("-5");
    expect(ast).toMatchObject({ type: "unary", op: "-" });
  });

  it("parses function call", () => {
    const ast = parseExpression("sin(x)");
    expect(ast).toMatchObject({ type: "call", name: "sin" });
  });

  it("parses multi-arg function call", () => {
    const ast = parseExpression("atan2(y,x)");
    expect(ast).toMatchObject({ type: "call", name: "atan2" });
  });

  it("parses parenthesized expression", () => {
    const ast = parseExpression("(1+2)*3");
    expect(ast).toMatchObject({ type: "binary", op: "*" });
  });

  it("throws ParseError for empty string", () => {
    expect(() => parseExpression("")).toThrow(ParseError);
  });

  it("throws ParseError for unknown function", () => {
    expect(() => parseExpression("evil(x)")).toThrow(ParseError);
  });

  it("throws ParseError for unexpected character", () => {
    expect(() => parseExpression("1@2")).toThrow(ParseError);
  });

  it("throws ParseError for trailing garbage", () => {
    expect(() => parseExpression("1 + 2 garbage")).toThrow(ParseError);
  });
});

// ─── Operator Precedence ──────────────────────────────────────────────────────

describe("operator precedence", () => {
  it("2+3*4 = 14 (mul before add)", () => {
    expect(safeEvaluate("2+3*4")).toBe(14);
  });

  it("(2+3)*4 = 20", () => {
    expect(safeEvaluate("(2+3)*4")).toBe(20);
  });

  it("2^3^2 = 512 (right-associative exponent: 2^9)", () => {
    // Right-assoc: 2^(3^2) = 2^9 = 512
    expect(safeEvaluate("2^3^2")).toBe(512);
  });

  it("4-2-1 = 1 (left-assoc subtraction)", () => {
    expect(safeEvaluate("4-2-1")).toBe(1);
  });

  it("8/4/2 = 1 (left-assoc division)", () => {
    expect(safeEvaluate("8/4/2")).toBe(1);
  });

  it("unary minus: -2^2 = 4 (unary binds tighter than ^)", () => {
    // Grammar: unary(-) > factor(^), so -2^2 = (-2)^2 = 4
    expect(safeEvaluate("-2^2")).toBe(4);
  });
});

// ─── evaluateAST ─────────────────────────────────────────────────────────────

describe("evaluateAST", () => {
  it("evaluates number node", () => {
    expect(evaluateAST({ type: "number", value: 7 })).toBe(7);
  });

  it("evaluates variable from scope", () => {
    const ast = parseExpression("x+1");
    expect(evaluateAST(ast, { x: 5 })).toBe(6);
  });

  it("evaluates built-in constant pi", () => {
    expect(evaluateAST(parseExpression("pi"))).toBeCloseTo(Math.PI);
  });

  it("evaluates built-in constant e", () => {
    expect(evaluateAST(parseExpression("e"))).toBeCloseTo(Math.E);
  });

  it("throws EvaluationError for undefined variable", () => {
    const ast = parseExpression("z");
    expect(() => evaluateAST(ast)).toThrow(EvaluationError);
  });

  it("throws EvaluationError for division by zero", () => {
    expect(() => safeEvaluate("1/0")).toThrow(EvaluationError);
  });

  it("evaluates unary minus", () => {
    expect(safeEvaluate("-3")).toBe(-3);
  });

  it("evaluates double unary minus", () => {
    expect(safeEvaluate("--3")).toBe(3);
  });
});

// ─── Allowed Functions ────────────────────────────────────────────────────────

describe("allowed math functions", () => {
  it("sin(0) = 0", () => expect(safeEvaluate("sin(0)")).toBeCloseTo(0));
  it("cos(0) = 1", () => expect(safeEvaluate("cos(0)")).toBeCloseTo(1));
  it("tan(0) = 0", () => expect(safeEvaluate("tan(0)")).toBeCloseTo(0));
  it("asin(1) = pi/2", () => expect(safeEvaluate("asin(1)")).toBeCloseTo(Math.PI / 2));
  it("acos(1) = 0", () => expect(safeEvaluate("acos(1)")).toBeCloseTo(0));
  it("atan(1) = pi/4", () => expect(safeEvaluate("atan(1)")).toBeCloseTo(Math.PI / 4));
  it("atan2(1,1) = pi/4", () => expect(safeEvaluate("atan2(1,1)")).toBeCloseTo(Math.PI / 4));
  it("sqrt(4) = 2", () => expect(safeEvaluate("sqrt(4)")).toBeCloseTo(2));
  it("abs(-5) = 5", () => expect(safeEvaluate("abs(-5)")).toBe(5));
  it("ceil(1.2) = 2", () => expect(safeEvaluate("ceil(1.2)")).toBe(2));
  it("floor(1.9) = 1", () => expect(safeEvaluate("floor(1.9)")).toBe(1));
  it("round(1.5) = 2", () => expect(safeEvaluate("round(1.5)")).toBe(2));
  it("log(e) = 1", () => expect(safeEvaluate("log(e)")).toBeCloseTo(1));
  it("log2(8) = 3", () => expect(safeEvaluate("log2(8)")).toBeCloseTo(3));
  it("log10(100) = 2", () => expect(safeEvaluate("log10(100)")).toBeCloseTo(2));
  it("exp(0) = 1", () => expect(safeEvaluate("exp(0)")).toBeCloseTo(1));
  it("pow(2,10) = 1024", () => expect(safeEvaluate("pow(2,10)")).toBe(1024));
  it("min(3,1,2) = 1", () => expect(safeEvaluate("min(3,1,2)")).toBe(1));
  it("max(3,1,2) = 3", () => expect(safeEvaluate("max(3,1,2)")).toBe(3));

  it("ALLOWED_FUNCTIONS set has 19 entries", () => {
    expect(ALLOWED_FUNCTIONS.size).toBe(19);
  });
});

// ─── Complex expressions ──────────────────────────────────────────────────────

describe("complex expressions", () => {
  it("sin(pi/2) = 1", () => {
    expect(safeEvaluate("sin(pi/2)")).toBeCloseTo(1);
  });

  it("sqrt(x^2 + y^2) with x=3, y=4 = 5", () => {
    expect(safeEvaluate("sqrt(x^2+y^2)", { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it("nested function: sqrt(abs(-9)) = 3", () => {
    expect(safeEvaluate("sqrt(abs(-9))")).toBeCloseTo(3);
  });

  it("multi-var expression: a*x^2 + b*x + c", () => {
    const result = safeEvaluate("a*x^2+b*x+c", { a: 1, b: -3, c: 2, x: 2 });
    // 1*(4) - 3*(2) + 2 = 4-6+2 = 0
    expect(result).toBeCloseTo(0);
  });

  it("scientific notation: 1e3 = 1000", () => {
    expect(safeEvaluate("1e3")).toBe(1000);
  });

  it("chained operations: 1+2+3+4+5 = 15", () => {
    expect(safeEvaluate("1+2+3+4+5")).toBe(15);
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────

describe("security: forbidden identifiers", () => {
  it("rejects eval", () => {
    expect(() => parseExpression("eval(1)")).toThrow(ParseError);
  });

  it("rejects Function", () => {
    expect(() => parseExpression("Function(1)")).toThrow(ParseError);
  });

  it("rejects __proto__", () => {
    expect(() => parseExpression("__proto__")).toThrow(ParseError);
  });

  it("rejects prototype", () => {
    expect(() => parseExpression("prototype")).toThrow(ParseError);
  });

  it("rejects constructor", () => {
    expect(() => parseExpression("constructor")).toThrow(ParseError);
  });

  it("rejects process", () => {
    expect(() => parseExpression("process")).toThrow(ParseError);
  });

  it("rejects require", () => {
    expect(() => parseExpression("require")).toThrow(ParseError);
  });

  it("unknown function not in whitelist throws ParseError", () => {
    expect(() => parseExpression("system(1)")).toThrow(ParseError);
  });
});

// ─── MathLive LaTeX Adapter ───────────────────────────────────────────────────

describe("parseMathLiveLatex", () => {
  it("converts \\frac{a}{b} to (a)/(b)", () => {
    const result = parseMathLiveLatex("\\frac{1}{2}");
    expect(result).toBe("(1)/(2)");
  });

  it("converts \\sqrt{x} to sqrt(x)", () => {
    expect(parseMathLiveLatex("\\sqrt{x}")).toBe("sqrt(x)");
  });

  it("converts \\sqrt[3]{x} to pow(x,1/(3))", () => {
    expect(parseMathLiveLatex("\\sqrt[3]{x}")).toContain("pow(x,1/(3))");
  });

  it("converts x^{2} to x^(2)", () => {
    expect(parseMathLiveLatex("x^{2}")).toBe("x^(2)");
  });

  it("converts \\cdot to *", () => {
    expect(parseMathLiveLatex("2\\cdot3")).toBe("2*3");
  });

  it("converts \\times to *", () => {
    expect(parseMathLiveLatex("2\\times3")).toBe("2*3");
  });

  it("converts \\div to /", () => {
    expect(parseMathLiveLatex("6\\div3")).toBe("6/3");
  });

  it("converts \\pi to pi", () => {
    expect(parseMathLiveLatex("\\pi")).toBe("pi");
  });

  it("converts \\left( \\right) to ()", () => {
    const r = parseMathLiveLatex("\\left(x+1\\right)");
    expect(r).toBe("(x+1)");
  });

  it("evaluates converted frac expression", () => {
    const expr = parseMathLiveLatex("\\frac{1}{2}");
    expect(safeEvaluate(expr)).toBeCloseTo(0.5);
  });

  it("evaluates converted sqrt expression", () => {
    const expr = parseMathLiveLatex("\\sqrt{9}");
    expect(safeEvaluate(expr)).toBeCloseTo(3);
  });

  it("strips unknown LaTeX commands", () => {
    // \sum is not supported — should be stripped
    const r = parseMathLiveLatex("\\sum x");
    expect(r).not.toContain("\\");
  });
});
