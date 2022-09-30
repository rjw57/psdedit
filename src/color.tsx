import { Color, RGBA } from 'ag-psd';

export const colorToColorString = (color?: Color) => {
  if(color?.hasOwnProperty('r')) {
    const rgbaColor = color as RGBA;
    return `rgba(${rgbaColor.r}, ${rgbaColor.g}, ${rgbaColor.b}, ${rgbaColor.a ?? 1})`;
  }

  // TODO: HSL, LAB, CMYK and Grayscale
  return 'rgba(0, 0, 0, 0)';
};
