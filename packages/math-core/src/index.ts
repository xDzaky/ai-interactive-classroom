/**
 * @ai-classroom/math-core
 * Safe expression evaluator using recursive descent parser (AST whitelist).
 * NEVER uses eval() or Function() on user text.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ASTNode =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: ASTNode; right: ASTNode }
  | { type: "unary"; op: "-"; operand: ASTNode }
  | { type: "call"; name: string; args: ASTNode[] };

export type SafeScope = Record<string, number>;

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ParseError extends Error {
  constructor(message: string, public readonly pos?: number) {
    super(message);
    this.name = "ParseError";
  }
}

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationError";
  }
}

// ─── Allowed functions ────────────────────────────────────────────────────────

export const ALLOWED_FUNCTIONS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "sqrt", "abs", "ceil", "floor", "round", "log", "log2", "log10",
  "exp", "pow", "min", "max",
]);

/** Built-in constants available in every scope */
const BUILTIN_CONSTANTS: SafeScope = {
  pi: Math.PI,
  e: Math.E,
};

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type TokenKind =
  | "number" | "ident" | "plus" | "minus" | "star" | "slash"
  | "caret" | "lparen" | "rparen" | "comma" | "eof";

interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

function tokenize(src: string): Token[] {
  // Security: reject dangerous identifiers before parsing
  const dangerous = ["eval", "Function", "__proto__", "prototype", "constructor", "global", "process", "require", "import"];
  for (const kw of dangerous) {
    if (src.includes(kw)) {
      throw new ParseError(`Forbidden identifier in expression: ${kw}`);
    }
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    // Skip whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Number (integer or decimal, may start with dot)
    if (/[0-9.]/.test(ch)) {
      let start = i;
      let hasDot = false;
      while (i < src.length && (/[0-9]/.test(src[i]) || (src[i] === "." && !hasDot))) {
        if (src[i] === ".") hasDot = true;
        i++;
      }
      // Scientific notation: 1e5, 2.3e-4
      if (i < src.length && (src[i] === "e" || src[i] === "E")) {
        i++;
        if (i < src.length && (src[i] === "+" || src[i] === "-")) i++;
        while (i < src.length && /[0-9]/.test(src[i])) i++;
      }
      tokens.push({ kind: "number", value: src.slice(start, i), pos: start });
      continue;
    }

    // Identifier (function name or variable)
    if (/[a-zA-Z_]/.test(ch)) {
      let start = i;
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      tokens.push({ kind: "ident", value: src.slice(start, i), pos: start });
      continue;
    }

    // Operators & punctuation
    const single: Record<string, TokenKind> = {
      "+": "plus", "-": "minus", "*": "star", "/": "slash",
      "^": "caret", "(": "lparen", ")": "rparen", ",": "comma",
    };
    if (ch in single) {
      tokens.push({ kind: single[ch], value: ch, pos: i });
      i++;
      continue;
    }

    throw new ParseError(`Unexpected character '${ch}'`, i);
  }

  tokens.push({ kind: "eof", value: "", pos: src.length });
  return tokens;
}

// ─── Recursive Descent Parser ─────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(src: string) {
    this.tokens = tokenize(src);
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private eat(kind: TokenKind): Token {
    const t = this.peek();
    if (t.kind !== kind) {
      throw new ParseError(`Expected '${kind}' but got '${t.kind}' (${JSON.stringify(t.value)})`, t.pos);
    }
    this.pos++;
    return t;
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  parse(): ASTNode {
    const node = this.parseExpr();
    if (this.peek().kind !== "eof") {
      const t = this.peek();
      throw new ParseError(`Unexpected token '${t.value}'`, t.pos);
    }
    return node;
  }

  /** expr → term (('+' | '-') term)* */
  private parseExpr(): ASTNode {
    let left = this.parseTerm();

    while (this.peek().kind === "plus" || this.peek().kind === "minus") {
      const op = this.consume().value as "+" | "-";
      const right = this.parseTerm();
      left = { type: "binary", op, left, right };
    }

    return left;
  }

  /** term → factor (('*' | '/') factor)* */
  private parseTerm(): ASTNode {
    let left = this.parseFactor();

    while (this.peek().kind === "star" || this.peek().kind === "slash") {
      const op = this.consume().value as "*" | "/";
      const right = this.parseFactor();
      left = { type: "binary", op, left, right };
    }

    return left;
  }

  /** factor → unary ('^' factor)?   (right-associative) */
  private parseFactor(): ASTNode {
    const base = this.parseUnary();

    if (this.peek().kind === "caret") {
      this.consume();
      const exponent = this.parseFactor(); // right-associative recursion
      return { type: "binary", op: "^", left: base, right: exponent };
    }

    return base;
  }

  /** unary → '-' unary | primary */
  private parseUnary(): ASTNode {
    if (this.peek().kind === "minus") {
      this.consume();
      const operand = this.parseUnary();
      return { type: "unary", op: "-", operand };
    }
    return this.parsePrimary();
  }

  /** primary → number | ident '(' args ')' | ident | '(' expr ')' */
  private parsePrimary(): ASTNode {
    const t = this.peek();

    if (t.kind === "number") {
      this.consume();
      const value = parseFloat(t.value);
      if (isNaN(value)) throw new ParseError(`Invalid number literal: ${t.value}`, t.pos);
      return { type: "number", value };
    }

    if (t.kind === "ident") {
      this.consume();
      // Function call?
      if (this.peek().kind === "lparen") {
        if (!ALLOWED_FUNCTIONS.has(t.value)) {
          throw new ParseError(`Unknown function: ${t.value}`, t.pos);
        }
        this.eat("lparen");
        const args: ASTNode[] = [];
        if (this.peek().kind !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek().kind === "comma") {
            this.consume();
            args.push(this.parseExpr());
          }
        }
        this.eat("rparen");
        return { type: "call", name: t.value, args };
      }
      // Variable reference
      return { type: "variable", name: t.value };
    }

    if (t.kind === "lparen") {
      this.consume();
      const inner = this.parseExpr();
      this.eat("rparen");
      return inner;
    }

    throw new ParseError(`Unexpected token '${t.value}' (${t.kind})`, t.pos);
  }
}

// ─── AST Evaluator ────────────────────────────────────────────────────────────

const MATH_FN_MAP: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
};

export function evaluateAST(node: ASTNode, scope: SafeScope = {}): number {
  const resolvedScope: SafeScope = { ...BUILTIN_CONSTANTS, ...scope };

  function evalNode(n: ASTNode): number {
    switch (n.type) {
      case "number":
        return n.value;

      case "variable": {
        if (n.name in resolvedScope) return resolvedScope[n.name];
        throw new EvaluationError(`Undefined variable: ${n.name}`);
      }

      case "unary":
        return -evalNode(n.operand);

      case "binary": {
        const l = evalNode(n.left);
        const r = evalNode(n.right);
        switch (n.op) {
          case "+": return l + r;
          case "-": return l - r;
          case "*": return l * r;
          case "/":
            if (r === 0) throw new EvaluationError("Division by zero");
            return l / r;
          case "^": return Math.pow(l, r);
        }
      }

      case "call": {
        const fn = MATH_FN_MAP[n.name];
        if (!fn) throw new EvaluationError(`Unknown function: ${n.name}`);
        const args = n.args.map(evalNode);
        return fn(...args);
      }
    }
  }

  return evalNode(node);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseExpression(source: string): ASTNode {
  if (typeof source !== "string") {
    throw new ParseError("Expression must be a string");
  }
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new ParseError("Empty expression");
  }
  return new Parser(trimmed).parse();
}

/**
 * Parse and evaluate an expression string in one step.
 * @param expr   Expression string, e.g. "sin(pi/2) + sqrt(x)"
 * @param scope  Optional variable bindings, e.g. { x: 4 }
 * @returns      Numeric result
 */
export function safeEvaluate(expr: string, scope: SafeScope = {}): number {
  const ast = parseExpression(expr);
  return evaluateAST(ast, scope);
}

// ─── MathLive LaTeX Adapter ───────────────────────────────────────────────────

/**
 * Convert a subset of LaTeX produced by MathLive into a plain expression string
 * that can be passed to parseExpression / safeEvaluate.
 *
 * Supported conversions:
 *   \frac{a}{b}   → (a)/(b)
 *   \sqrt{x}      → sqrt(x)
 *   \sqrt[n]{x}   → pow(x,1/n)
 *   x^{2}         → x^2         (single char exponent already works)
 *   x^{10}        → x^(10)
 *   \cdot          → *
 *   \times         → *
 *   \div           → /
 *   \pi            → pi
 *   \infty         → Infinity    (will evaluate to Infinity)
 *   \left( \right) → ( )
 *   spaces         → removed
 */
export function parseMathLiveLatex(latex: string): string {
  let s = latex.trim();

  // Remove display/inline math delimiters if present
  s = s.replace(/^\\\[|\\\]$|^\$\$|\$\$$|^\$|\$$/g, "");

  // \left( and \right) → ( )
  s = s.replace(/\\left\s*\(/g, "(").replace(/\\right\s*\)/g, ")");
  s = s.replace(/\\left\s*\[/g, "(").replace(/\\right\s*\]/g, ")");

  // \frac{a}{b} → (a)/(b)  — handle nested braces with simple depth counter
  s = replaceFrac(s);

  // \sqrt[n]{x} → pow(x,1/n)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "pow($2,1/($1))");
  // \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");

  // x^{expr} → x^(expr) for multi-char exponents
  s = s.replace(/\^\{([^}]+)\}/g, (_, e) => `^(${e})`);

  // \cdot, \times → *
  s = s.replace(/\\cdot/g, "*").replace(/\\times/g, "*");

  // \div → /
  s = s.replace(/\\div/g, "/");

  // Greek letters / constants
  s = s.replace(/\\pi/g, "pi").replace(/\\e\b/g, "e");
  s = s.replace(/\\infty/g, "Infinity");

  // \sin, \cos, etc. → sin, cos, etc.
  for (const fn of ALLOWED_FUNCTIONS) {
    s = s.replace(new RegExp(`\\\\${fn}\\b`, "g"), fn);
  }

  // Remove remaining backslash commands (unsupported)
  s = s.replace(/\\[a-zA-Z]+/g, "");

  // Remove braces used as grouping (not inside function calls)
  s = s.replace(/\{/g, "(").replace(/\}/g, ")");

  // Implicit multiplication: 2x → 2*x, )( → )*(
  s = s.replace(/(\d)([a-zA-Z])/g, "$1*$2");
  s = s.replace(/\)\s*\(/g, ")*(");

  // Collapse whitespace
  s = s.replace(/\s+/g, "");

  return s;
}

/** Replace \frac{numerator}{denominator} respecting nested braces. */
function replaceFrac(s: string): string {
  let result = s;
  // Repeat until no more \frac
  for (let iterations = 0; iterations < 20; iterations++) {
    const idx = result.indexOf("\\frac{");
    if (idx === -1) break;

    const numStart = idx + 6; // after \frac{
    const [numEnd, numContent] = findBraceEnd(result, numStart);
    if (numEnd === -1) break;

    // After numerator closing }, expect {denominator}
    let i = numEnd + 1;
    while (i < result.length && result[i] === " ") i++;
    if (result[i] !== "{") break;
    const [denEnd, denContent] = findBraceEnd(result, i + 1);
    if (denEnd === -1) break;

    const replacement = `(${numContent})/(${denContent})`;
    result = result.slice(0, idx) + replacement + result.slice(denEnd + 1);
  }
  return result;
}

/** Find the index of the matching } and the content inside, starting from `start`. */
function findBraceEnd(s: string, start: number): [number, string] {
  let depth = 1;
  let i = start;
  while (i < s.length && depth > 0) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") depth--;
    if (depth > 0) i++;
    else break;
  }
  if (depth !== 0) return [-1, ""];
  return [i, s.slice(start, i)];
}

export * from "./intentClassifier.js";

