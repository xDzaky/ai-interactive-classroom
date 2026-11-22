/**
 * AiExplainModal.tsx — P11-T01 / P15-T01
 * Socratic AI Explanation Modal for selected whiteboard math objects & shapes.
 */

import React from 'react';
import type { BoardObject, BoardStroke } from '@ai-classroom/whiteboard-core';

export interface AiExplainModalProps {
  target: BoardObject | BoardStroke | null;
  onClose: () => void;
}

interface MathFact {
  title: string;
  formula: string;
  properties: string[];
  socraticHint: string;
}

function getMathFact(target: BoardObject | BoardStroke | null): MathFact {
  if (!target) {
    return {
      title: 'Objek Papan Tulis',
      formula: '-',
      properties: ['Objek visual pada kanvas interaktif.'],
      socraticHint: 'Coba pilih bangun geometri atau rumus untuk mendapatkan penjelasan matematika.',
    };
  }

  // Check if stroke
  if ('points' in target) {
    return {
      title: 'Coretan Tangan Bebas (Stroke)',
      formula: `Panjang goresan ≈ ${target.points.length} titik sampel`,
      properties: [
        'Dibuat menggunakan algoritma perfect-freehand.',
        'Dapat dikonversi menjadi bangun datar otomatis jika mendekati bentuk geometris.',
      ],
      socraticHint: 'Tahukah kamu? Bentuk tanganmu bisa dikenali AI menjadi lingkaran, kotak, atau segitiga beraturan!',
    };
  }

  const obj = target as BoardObject;
  const p = obj.props as Record<string, unknown>;

  if (obj.object_type === 'viz_solid') {
    const solidType = (p.solidType as string) || (p.type as string) || 'cube';
    switch (solidType) {
      case 'cube':
        return {
          title: 'Kubus (Hexahedron Beraturan)',
          formula: 'V = s³, L = 6s², Diagonal Ruang = s√3',
          properties: [
            '6 bidang sisi berbentuk persegi kongruen.',
            '12 rusuk sama panjang.',
            '8 titik sudut siku-siku (90°).',
            '4 diagonal ruang yang berpotongan di satu titik pusat.',
          ],
          socraticHint: 'Jika panjang rusuk kubus dilipatgandakan menjadi 2s, berapa kali lipat volume barunya?',
        };
      case 'cuboid':
        return {
          title: 'Balok (Prisma Segiempat)',
          formula: 'V = p × l × t, L = 2(pl + pt + lt)',
          properties: [
            '6 bidang sisi berbentuk persegi panjang.',
            '3 pasang sisi yang berhadapan sejajar dan kongruen.',
            '12 rusuk terbagi dalam 3 kelompok ukuran sejajar.',
          ],
          socraticHint: 'Bagaimana cara menentukan panjang kawat minimum untuk membuat kerangka balok ini?',
        };
      case 'cylinder':
        return {
          title: 'Tabung (Silinder Lingkaran Tegak)',
          formula: 'V = πr²t, L = 2πr(r + t)',
          properties: [
            '2 sisi alas dan tutup berupa lingkaran kongruen.',
            '1 sisi lengkung (selimut tabung) yang jika dibuka berupa persegi panjang berukuran 2πr × t.',
            'Tidak memiliki titik sudut.',
          ],
          socraticHint: 'Mengapa kaleng minuman umumnya berbentuk tabung dibanding balok?',
        };
      case 'cone':
        return {
          title: 'Kerucut (Limas Lingkaran)',
          formula: 'V = ⅓πr²t, L = πr(r + s), s = √(r² + t²)',
          properties: [
            '1 sisi alas lingkaran dan 1 selimut kerucut berupa juring lingkaran.',
            '1 titik puncak (apex).',
            'Volume tepat ⅓ dari volume tabung dengan alas dan tinggi yang sama.',
          ],
          socraticHint: 'Mengapa volume kerucut selalu tepat sepertiga dari tabung pasangannya?',
        };
      case 'sphere':
        return {
          title: 'Bola',
          formula: 'V = ⁴⁄₃πr³, L = 4πr²',
          properties: [
            'Himpunan titik-titik ruang yang berjarak sama (r) dari titik pusat.',
            'Memiliki luas permukaan terkecil untuk volume tertentu (sifat isoperimetrik).',
          ],
          socraticHint: 'Tahukah kamu rumus Archimedes bahwa luas bola sama dengan luas selimut tabung pembungkusnya?',
        };
      case 'pyramid':
        return {
          title: 'Limas (Piramida)',
          formula: 'V = ⅓ × Luas Alas × t',
          properties: [
            'Alas berupa poligon datar (segitiga atau segiempat).',
            'Sisi tegak berupa segitiga-segitiga yang bertemu di puncak.',
          ],
          socraticHint: 'Bagaimana perbandingan volume limas segiempat dengan balok yang melingkupinya?',
        };
      default:
        return {
          title: `Bangun Ruang 3D (${solidType})`,
          formula: 'V = Luas Alas × Tinggi (untuk prisma tegak)',
          properties: ['Objek 3D interaktif yang dapat diputar 360°, diiris, dan dibuka jaring-jaringnya.'],
          socraticHint: 'Gunakan slider jaring-jaring di bawah untuk mengamati pembentukan sisi-sisinya!',
        };
    }
  }

  if (obj.object_type === 'rect') {
    return {
      title: 'Persegi / Persegi Panjang',
      formula: 'Luas = p × l, Keliling = 2(p + l)',
      properties: ['Empat sudut siku-siku (90°).', 'Sisi-sisi yang berhadapan sejajar dan sama panjang.'],
      socraticHint: 'Ingin melihat bangun ini dalam bentuk 3D? Klik tombol "Ubah ke 3D" untuk menjadikannya Kubus atau Balok!',
    };
  }

  if (obj.object_type === 'circle') {
    return {
      title: 'Lingkaran',
      formula: 'Luas = πr², Keliling = 2πr',
      properties: ['Jarak setiap titik pada kurva ke titik pusat adalah konstan (r).', 'Memiliki simetri lipat dan putar tak hingga.'],
      socraticHint: 'Bisa diubah menjadi Bola, Tabung, atau Kerucut menggunakan menu kontekstual 3D.',
    };
  }

  if (obj.object_type === 'triangle') {
    return {
      title: 'Segitiga',
      formula: 'Luas = ½ × alas × tinggi, Sudut Dalam = 180°',
      properties: ['Jumlah ketiga sudut dalam selalu tepat 180° (geometri Euklides).'],
      socraticHint: 'Dapat diekstrusi menjadi Prisma Segitiga atau diputar menjadi Kerucut!',
    };
  }

  return {
    title: `Objek Geometri (${obj.object_type})`,
    formula: 'Bentuk geometris Kurikulum Merdeka',
    properties: ['Objek dapat diatur skala, posisi, dan warnanya melalui papan tulis.'],
    socraticHint: 'Eksplorasi lebih jauh dengan memadukannya bersama bangun lain di kanvas.',
  };
}

export function AiExplainModal({ target, onClose }: AiExplainModalProps) {
  if (!target) return null;
  const fact = getMathFact(target);

  return (
    <div
      data-testid="ai-explain-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-slate-900 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-lg">
              🤖
            </span>
            <div>
              <h3 className="font-semibold text-base text-slate-100">{fact.title}</h3>
              <p className="text-xs text-indigo-400 font-mono">{fact.formula}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex flex-col gap-4 text-xs">
          <div>
            <h4 className="font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
              Sifat-Sifat Matematis
            </h4>
            <ul className="flex flex-col gap-1 text-slate-300">
              {fact.properties.map((prop, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>{prop}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1">
              <span>💡</span> Pertanyaan Sokrates untuk Diskusi Kelas:
            </div>
            <p className="italic text-slate-200">{fact.socraticHint}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition"
          >
            Paham & Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
