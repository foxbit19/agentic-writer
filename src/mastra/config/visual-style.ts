/**
 * Fixed brand visual style for all AI-generated graphics. The Graphic Designer agent applies
 * this on every image regardless of what creative brief it receives.
 */
export const visualStyle = {
  primaryColor: 'rgb(69 94 232 / 1)',
  backgroundColor: 'rgb(3 7 18 / 1)',
  paletteNotes:
    'Use the primary blue-violet and its tints/shades as the only accent colors on the near-black background. Do not introduce unrelated hues.',
  styleNotes:
    'Evocative abstract 2D illustration grounded in the article subject — mood, metaphor, and simple schematic figures over literal depiction. Simple geometric forms, arrows, before/after silhouettes, icon-like shapes, bold silhouettes, generous negative space. No photorealism, no 3D, no busy detail. Never render text, letters, numbers, logos, axes, or labeled data charts. Avoid gradients and texture. One light source if any shading. Keep compositions minimal and symbolic.',
} as const;

export function formatVisualStyle(): string {
  return `Primary color: ${visualStyle.primaryColor}
Background color: ${visualStyle.backgroundColor}
Palette: ${visualStyle.paletteNotes}
Style: ${visualStyle.styleNotes}`;
}
