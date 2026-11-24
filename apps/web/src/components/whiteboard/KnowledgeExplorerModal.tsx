/**
 * KnowledgeExplorerModal.tsx — Interactive AI Knowledge Graph Explorer (V4)
 *
 * Maps active topics to Prerequisites, Related Formulas, 3D Solids, Validated Simulations,
 * and Official PhET Labs. Clicking any node directly launches or inserts it onto the whiteboard!
 */
import React, { useState } from 'react';
import type { SimulationTemplateId } from '@ai-classroom/whiteboard-core';
import type { SolidType } from '@ai-classroom/geometry-core';

interface KnowledgeNode {
  id: string;
  label: string;
  kind: 'topic' | 'formula' | 'solid' | 'simulation' | 'phet';
  x: number;
  y: number;
  payload?: string;
}

const TOPICS: Record<string, { title: string; nodes: KnowledgeNode[]; edges: [string, string][] }> = {
  pythagoras: {
    title: 'Geometri & Teorema Pythagoras',
    nodes: [
      { id: 'center', label: 'Pythagoras', kind: 'topic', x: 260, y: 150 },
      { id: 'f1', label: 'c² = a² + b²', kind: 'formula', x: 95, y: 75, payload: '3^2 + 4^2' },
      { id: 's1', label: 'Kubus 3D (Diagonal)', kind: 'solid', x: 430, y: 75, payload: 'cube' },
      { id: 'sim1', label: 'Transformasi 2D', kind: 'simulation', x: 430, y: 230, payload: 'math.geometry_transform' },
      { id: 'phet1', label: 'PhET: Area Builder', kind: 'phet', x: 95, y: 230, payload: 'phet-area' },
    ],
    edges: [
      ['center', 'f1'],
      ['center', 's1'],
      ['center', 'sim1'],
      ['center', 'phet1'],
    ],
  },
  kuadrat: {
    title: 'Fungsi Kuadrat & Parabola',
    nodes: [
      { id: 'center', label: 'Fungsi Kuadrat', kind: 'topic', x: 260, y: 150 },
      { id: 'f1', label: 'ax² + bx + c', kind: 'formula', x: 95, y: 75, payload: 'x^2 - 2x - 3' },
      { id: 'sim1', label: 'Simulasi Parabola', kind: 'simulation', x: 430, y: 75, payload: 'math.function_explorer' },
      { id: 'sim2', label: 'Gerak Parabola', kind: 'simulation', x: 430, y: 230, payload: 'physics.projectile_motion' },
      { id: 'phet1', label: 'PhET: Quadratics', kind: 'phet', x: 95, y: 230, payload: 'phet-quadratics' },
    ],
    edges: [
      ['center', 'f1'],
      ['center', 'sim1'],
      ['center', 'sim2'],
      ['center', 'phet1'],
    ],
  },
  peluang: {
    title: 'Peluang & Statistika',
    nodes: [
      { id: 'center', label: 'Peluang', kind: 'topic', x: 260, y: 150 },
      { id: 'f1', label: 'P(A) = n(A)/n(S)', kind: 'formula', x: 95, y: 75, payload: '\\frac{1}{6}' },
      { id: 'sim1', label: 'Histogram Dadu', kind: 'simulation', x: 430, y: 75, payload: 'math.probability_dice' },
      { id: 's1', label: 'Dadu 3D Lipat', kind: 'solid', x: 430, y: 230, payload: 'cube' },
      { id: 'phet1', label: 'PhET: Plinko', kind: 'phet', x: 95, y: 230, payload: 'phet-plinko' },
    ],
    edges: [
      ['center', 'f1'],
      ['center', 'sim1'],
      ['center', 's1'],
      ['center', 'phet1'],
    ],
  },
};

export interface KnowledgeExplorerModalProps {
  open: boolean;
  onClose: () => void;
  onInsertFormula: (latex: string) => void;
  onInsertSolid: (solidType: SolidType) => void;
  onInsertSimulation: (templateId: SimulationTemplateId) => void;
  onOpenPhET: (simId: string) => void;
}

export const KnowledgeExplorerModal: React.FC<KnowledgeExplorerModalProps> = ({
  open,
  onClose,
  onInsertFormula,
  onInsertSolid,
  onInsertSimulation,
  onOpenPhET,
}) => {
  const [topicKey, setTopicKey] = useState<string>('pythagoras');
  if (!open) return null;

  const graph = TOPICS[topicKey];

  const handleNodeClick = (node: KnowledgeNode) => {
    if (!node.payload) return;
    if (node.kind === 'formula') onInsertFormula(node.payload);
    else if (node.kind === 'solid') onInsertSolid(node.payload as SolidType);
    else if (node.kind === 'simulation') onInsertSimulation(node.payload as SimulationTemplateId);
    else if (node.kind === 'phet') onOpenPhET(node.payload);
    onClose();
  };

  return (
    <div
      data-testid="knowledge-explorer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI Knowledge Explorer"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">AI Knowledge Explorer</h2>
            <p className="text-[11px] text-slate-500">
              Klik node konsep untuk langsung memasang rumus, bangun 3D, simulasi, atau lab PhET
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>

        <div className="mb-3 flex gap-1.5">
          {Object.entries(TOPICS).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTopicKey(key)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                topicKey === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {val.title}
            </button>
          ))}
        </div>

        <svg viewBox="0 0 540 300" className="h-72 w-full rounded-2xl border border-slate-200 bg-slate-50">
          {graph.edges.map(([fromId, toId], idx) => {
            const a = graph.nodes.find((n) => n.id === fromId)!;
            const b = graph.nodes.find((n) => n.id === toId)!;
            return (
              <line
                key={idx}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            );
          })}
          {graph.nodes.map((node) => {
            const fill =
              node.kind === 'topic'
                ? '#4f46e5'
                : node.kind === 'formula'
                  ? '#10b981'
                  : node.kind === 'simulation'
                    ? '#0284c7'
                    : node.kind === 'phet'
                      ? '#d97706'
                      : '#334155';
            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className={node.payload ? 'cursor-pointer' : ''}
              >
                <rect
                  x={node.x - 74}
                  y={node.y - 20}
                  width="148"
                  height="40"
                  rx="12"
                  fill={fill}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
