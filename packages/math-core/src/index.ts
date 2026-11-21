/**
 * @ai-classroom/math-core
 * Safe expression evaluator using AST whitelist.
 * NEVER call evaluate on raw user strings without going through parseExpression first.
 */

export type ASTNode =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: ASTNode; right: ASTNode }
  | { type: "unary"; op: "-"; operand: ASTNode }
  | { type: "call"; name: string; args: ASTNode[] };

export type SafeScope = Record<string, number>;

/** Allowed function names in expressions */
export const ALLOWED_FUNCTIONS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "sqrt", "abs", "ceil", "floor", "round", "log", "log2", "log10",
  "exp", "pow", "min", "max",
]);

// Placeholder — real safe evaluator implemented in P03-T04
export function parseExpression(_source: string): ASTNode {
  throw new Error("Not implemented — see P03-T04");
}

export function evaluateAST(_node: ASTNode, _scope: SafeScope): number {
  throw new Error("Not implemented — see P03-T04");
}
