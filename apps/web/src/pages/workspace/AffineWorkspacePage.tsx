/**
 * AffineWorkspacePage.tsx — Dedicated Route `/workspace` and `/workspace/:docId` (V7)
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { AffineWorkspaceShell } from '@/components/affine/AffineWorkspaceShell';

export default function AffineWorkspacePage() {
  const { docId } = useParams<{ docId?: string }>();
  return <AffineWorkspaceShell initialDocId={docId} />;
}
