/**
 * Fixed brand visual style for all AI-generated graphics. The Graphic Designer agent applies
 * this on every image regardless of what creative brief it receives, so the visual identity
 * stays consistent across posts - edit the fields below to rebrand without touching the agent.
 */
export const visualStyle = {
  primaryColor: 'rgb(69 94 232 / 1)',
  backgroundColor: 'rgb(3 7 18 / 1)',
  paletteNotes:
    'Use the primary blue-violet and its tints/shades (lighter/darker variants of the same hue) as the only accent colors, on the near-black background. Do not introduce unrelated hues.',
  styleNotes:
    'Flat, super simple 2D illustration - clean geometric shapes, bold silhouettes, generous negative space. No photorealism, no 3D rendering, no busy detail. Do not write text on the image, do not include logos or branding, do not use stock photos. Avoid gradients, texture. Use a single light source for any shading. Avoid complex compositions - keep it simple and clear.',
} as const;

export function formatVisualStyle(): string {
  return `Primary color: ${visualStyle.primaryColor}
Background color: ${visualStyle.backgroundColor}
Palette: ${visualStyle.paletteNotes}
Style: ${visualStyle.styleNotes}`;
}
