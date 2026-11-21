# @ai-classroom/whiteboard-core

Deterministic whiteboard state management, event reducer, and history tracking for **AI Interactive Classroom**.

## Features

- **Pure State Reducer**: Pure function `(state, event) => newState` handling strokes, shapes, text, math, and layers.
- **Invertible Operations**: Automatic generation of inverse events for robust undo/redo capabilities.
- **Scenes & Slides**: Multi-slide presentation state management with layer ordering.
- **Serialization**: Schema-validated JSON export and import.
