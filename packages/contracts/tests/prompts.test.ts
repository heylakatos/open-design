import { describe, expect, it } from 'vitest';

import { DISCOVERY_AND_PHILOSOPHY } from '../src/prompts/discovery';
import { DESIGN_DIRECTIONS, renderDirectionFormBody } from '../src/prompts/directions';
import { composeSystemPrompt } from '../src/prompts/system';

function extractQuestionFormBody(prompt: string, id: string): string {
  const pattern = new RegExp(`<question-form id="${id}"[^>]*>\\n([\\s\\S]*?)\\n</question-form>`);
  const match = prompt.match(pattern);
  if (!match?.[1]) throw new Error(`Missing question-form ${id}`);
  return match[1];
}

describe('discovery prompt question forms', () => {
  it('embeds a valid discovery form with the expected required fields', () => {
    const body = extractQuestionFormBody(DISCOVERY_AND_PHILOSOPHY, 'discovery');
    const form = JSON.parse(body) as {
      description: string;
      questions: Array<{ id: string; type: string; required?: boolean; maxSelections?: number }>;
    };

    expect(form.description).toContain("I'll lock these in before building");
    expect(form.questions.map((question) => question.id)).toEqual([
      'output',
      'platform',
      'audience',
      'tone',
      'brand',
      'scale',
      'constraints',
    ]);
    expect(form.questions.find((question) => question.id === 'output')).toMatchObject({
      type: 'radio',
      required: true,
    });
    expect(form.questions.find((question) => question.id === 'tone')).toMatchObject({
      type: 'checkbox',
      maxSelections: 2,
    });
  });

  it('keeps the form-authoring type allowlist aligned with the direction-card picker', () => {
    expect(DISCOVERY_AND_PHILOSOPHY).toContain('type` is one of:');
    expect(DISCOVERY_AND_PHILOSOPHY).toContain('`direction-cards`');
  });

  it('renders direction cards for every built-in design direction', () => {
    const form = JSON.parse(renderDirectionFormBody()) as {
      questions: Array<{
        id: string;
        type: string;
        options?: string[];
        cards?: Array<{ id: string; palette: string[] }>;
      }>;
    };
    const directionQuestion = form.questions.find((question) => question.id === 'direction');

    expect(directionQuestion).toMatchObject({
      type: 'direction-cards',
      options: DESIGN_DIRECTIONS.map((direction) => direction.id),
    });
    expect(directionQuestion?.cards?.map((card) => card.id)).toEqual(
      DESIGN_DIRECTIONS.map((direction) => direction.id),
    );
    for (const card of directionQuestion?.cards ?? []) {
      expect(card.palette).toHaveLength(6);
      expect(card.palette.every((value) => value.startsWith('oklch('))).toBe(true);
    }
  });
});

describe('system prompt composition', () => {
  it('places discovery rules before the background official prompt', () => {
    const prompt = composeSystemPrompt({});

    expect(prompt.indexOf('# OD core directives')).toBeGreaterThanOrEqual(0);
    expect(prompt.indexOf('# OD core directives')).toBeLessThan(
      prompt.indexOf('# Identity and workflow charter'),
    );
  });
});
