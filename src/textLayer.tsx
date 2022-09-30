import { Layer } from 'ag-psd';
import { colorToColorString } from './color';

export const updateTextLayer = (layer: Layer, newText: string): Layer => {
  const { text: oldText, canvas: oldCanvas } = layer;
  if(!oldText || !oldCanvas) { return layer; }

  const text = { ...oldText, text: newText };
  const { style: {
    fontSize = 12,
    fillColor = {r: 0, g: 0, b: 0},
    font: {
      name: fontName = "serif"
    } = {},
  } = {} } = text;
  const colorString = colorToColorString(fillColor);
  console.log(text, fontSize, fontName);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if(ctx) {
    ctx.font = `${fontSize}px "${fontName}"`;
    ctx.fillStyle = colorString;

    const textMetrics = ctx.measureText(text.text);
    canvas.width = Math.max(1, Math.ceil(textMetrics.width));
    canvas.height = Math.ceil(1.2 * fontSize);

    ctx.font = `${fontSize}pt "${fontName}"`;
    ctx.fillStyle = colorString;
    ctx.fillText(text.text, 0, fontSize);
  }

  const right = (layer.left || 0) + canvas.width;
  const bottom = (layer.top || 0) + canvas.height;

  return {...layer, right, bottom, canvas, text };
};
