# @ai-classroom/math-core

Safe mathematical expression parser and AST evaluator for **AI Interactive Classroom**.

## Security Model

- **Zero Dynamic Code Execution**: Strict AST traversal without invoking `eval()`, `new Function()`, or unconstrained parser calls.
- **Whitelist Operations**: Supports arithmetic, standard functions (`sin`, `cos`, `sqrt`, `ln`, `abs`), variables, and constants (`pi`, `e`).
- **LaTeX Adapter**: Bidirectional translation between MathLive LaTeX tokens and computational AST.
