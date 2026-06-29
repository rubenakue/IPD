import { describe, expect, it } from 'vitest';
import {
  findChapterNameConflict,
  summarizeBudgetLines,
  validateBudgetForApproval,
} from '../src/lib/budget/summary.ts';
import type { BudgetLineView } from '../src/types/api.ts';

const lines: BudgetLineView[] = [
  {
    id: 'l1',
    chapterCode: '01',
    chapterName: 'Cimentacion',
    code: '01.01',
    name: 'Excavacion',
    baseAmountCents: 100_00,
  },
  {
    id: 'l2',
    chapterCode: '01',
    chapterName: 'Cimentacion',
    code: '01.02',
    name: 'Losa',
    baseAmountCents: 250_00,
  },
  {
    id: 'l3',
    chapterCode: '02',
    chapterName: 'Estructura',
    code: '02.01',
    name: 'Pilares',
    baseAmountCents: 400_00,
  },
];

describe('budget summary', () => {
  it('agrupa partidas por capitulo y calcula subtotales y total en centimos', () => {
    const summary = summarizeBudgetLines(lines);

    expect(summary.totalBaseAmountCents).toBe(750_00);
    expect(summary.chapters).toEqual([
      expect.objectContaining({ chapterCode: '01', subtotalBaseAmountCents: 350_00 }),
      expect.objectContaining({ chapterCode: '02', subtotalBaseAmountCents: 400_00 }),
    ]);
  });

  it('rechaza aprobacion sin lineas, total cero o codigos duplicados normalizados', () => {
    expect(validateBudgetForApproval([]).isValid).toBe(false);
    expect(validateBudgetForApproval([{ ...lines[0], baseAmountCents: 0 }]).isValid).toBe(false);

    const validation = validateBudgetForApproval([
      lines[0],
      { ...lines[1], code: ' 01.01 ', baseAmountCents: 1 },
    ]);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.join(' ')).toContain('duplicado');
  });

  it('agrupa el mismo capitulo aunque el codigo varie en mayusculas o espacios', () => {
    const summary = summarizeBudgetLines([
      { id: 'a', chapterCode: 'C01', chapterName: 'Cimentacion', code: '01.01', name: 'Excavacion', baseAmountCents: 100_00 },
      { id: 'b', chapterCode: ' c01 ', chapterName: 'Cimentacion', code: '01.02', name: 'Losa', baseAmountCents: 50_00 },
    ]);

    expect(summary.chapters).toHaveLength(1);
    expect(summary.chapters[0]).toEqual(
      expect.objectContaining({ chapterCode: 'C01', subtotalBaseAmountCents: 150_00 }),
    );
  });

  it('detecta nombres inconsistentes para el mismo codigo de capitulo', () => {
    const conflict = findChapterNameConflict([
      { chapterCode: '01', chapterName: 'Cimentacion' },
      { chapterCode: ' 01 ', chapterName: 'Estructura' },
    ]);

    expect(conflict).toEqual({
      chapterCode: ' 01 ',
      firstName: 'Cimentacion',
      conflictingName: 'Estructura',
    });
  });
});
