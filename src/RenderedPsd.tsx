import * as React from 'react';
import { Psd, Layer } from 'ag-psd';
import { colorToColorString } from './color';

interface RenderedLayerProps {
  layer: Layer;
}

const useCanvasDataUrl = (canvas?: HTMLCanvasElement) => {
  const [dataURL, setDataURL] = React.useState<string>();
  React.useEffect(() => { setDataURL(canvas?.toDataURL('image/png')); }, [canvas]);
  return dataURL;
};

const renderFilter = (id: string, layer: Layer) : React.ReactNode => {
  const { effects } = layer;
  const filters: React.ReactNode[] = [];
  // Early out for no effects.
  if(!effects) { return null; }

  // Name of layer source graphic. Replaced if the layer has a solid fill effect.
  let sourceGraphicId = 'SourceGraphic'

  // Ids of filters for each effect which should be composited *below* the original layer.
  const belowFilters: string[] = [];

  // Solid fill
  effects.solidFill?.filter(({ enabled }) => enabled).forEach(solidFill => {
    const { color } = solidFill;
    const colorString = colorToColorString(color);
    const filterId = `filter-${filters.length}`;

    // A flood fill with the solid colour.
    filters.push(
      <feFlood
        result={`${filterId}-flood`}
        key={`${filterId}-flood`}
        floodColor={colorString}
      />
    );

    // Composite the flood fill "in" the alpha mask to return the final coloured effect.
    filters.push(
      <feComposite
        in={`${filterId}-flood`}
        in2="SourceAlpha"
        operator="in"
        result={`${filterId}-fill`}
        key={`${filterId}-fill`}
      />
    );

    // Use the solid fill as the layer image
    sourceGraphicId = `${filterId}-fill`;
  });

  // Drop shadow
  effects.dropShadow?.filter(({ enabled }) => enabled).forEach(dropShadow => {
    const { angle, distance, size, color } = dropShadow;
    const colorString = colorToColorString(color);

    // TODO: check sign and chirality
    const x = - Math.cos(2 * Math.PI * (angle ?? 0) / 360);
    const y = Math.sin(2 * Math.PI * (angle ?? 0) / 360);

    const filterId = `filter-${filters.length}`;

    // The the alpha layer to generate the drop shadow mask. The colour of this mask is black and
    // the alpha channel defines the shadow.
    filters.push(
      <feOffset
        in="SourceAlpha"
        result={`${filterId}-hard-shadow`}
        key={`${filterId}-hard-shadow`}
        dx={x} dy={y}
      />
    );

    // Blur the hard shadow using the shadow size
    filters.push(
      <feGaussianBlur
        in={`${filterId}-hard-shadow`}
        result={`${filterId}-shadow`}
        key={`${filterId}-shadow`}
        stdDeviation={distance?.value ?? 0}
      />
    );

    // A flood fill with the shadow colour.
    filters.push(
      <feFlood
        result={`${filterId}-flood`}
        key={`${filterId}-flood`}
        floodColor={colorString}
      />
    );

    // Composite the flood fill "in" the mask to return the final coloured effect.
    filters.push(
      <feComposite
        in={`${filterId}-flood`}
        in2={`${filterId}-hard-shadow`}
        operator="in"
        result={`${filterId}-blend`}
        key={`${filterId}-blend`}
      />
    );

    belowFilters.push(`${filterId}-blend`);
  });

  // Stroke effects
  effects.stroke?.filter(({ enabled }) => enabled).forEach(stroke => {
    const { size, color } = stroke;
    const colorString = colorToColorString(color);

    // How wise should the convolution kernel be in pixels?
    const kernelPizelSize = size?.value ?? 1;
    const kernelWidth = Math.ceil(kernelPizelSize) * 2 + 1;

    // Generate the filter kernel.
    const rowDelta = new Array(kernelWidth).fill(null).map((_, idx) => idx - 0.5 * (kernelWidth - 1));
    const kernelMatrix = rowDelta.map(y => (
      rowDelta.map(x => x*x + y*y <= kernelPizelSize*kernelPizelSize ? 1 : 0).join(' ')
    )).join('\n');

    const filterId = `filter-${filters.length}`;

    // Use the alpha layer to generate a stoke mask. The colour of this mask is black and the alpha
    // channel defines the stroke.
    filters.push(
      <feConvolveMatrix
        in="SourceAlpha"
        result={`${filterId}-stroke`}
        key={`${filterId}-stroke`}
        order={kernelWidth}
        divisor="1"
        kernelMatrix={kernelMatrix}
      />
    );

    // A flood fill with the stroke colour.
    filters.push(
      <feFlood
        result={`${filterId}-flood`}
        key={`${filterId}-flood`}
        floodColor={colorString}
      />
    );

    // Composite the stroke flood fill "in" the stroke mask to return the final coloured stroke.
    filters.push(
      <feComposite
        in={`${filterId}-flood`}
        in2={`${filterId}-stroke`}
        operator="in"
        result={`${filterId}-blend`}
        key={`${filterId}-blend`}
      />
    );

    belowFilters.push(`${filterId}-blend`);
  });

  if(filters.length === 0) { return null; }

  const filterId = `filter-${filters.length}`;
  filters.push(
    <feMerge result={filterId} key={filterId}>
      {belowFilters.map(id => <feMergeNode in={id} key={id} />)}
      <feMergeNode in={sourceGraphicId} />
    </feMerge>
  );

  return <filter id={id}>{filters}</filter>;
};

const renderMask = (id: string, layer: Layer, dataURL?: string) : React.ReactNode => {
  const { mask } = layer;

  if(!mask) { return null; }

  // TODO layer.mask.positionRelativeToLayer
  const maskLeft = layer.mask?.left ?? 0, maskTop = layer.mask?.top ?? 0;
  const maskWidth = (layer.mask?.right ?? 0) - maskLeft, maskHeight = (layer.mask?.bottom ?? 0) - maskTop;

  return (
    <mask id={id}>
      <image x={maskLeft} y={maskTop} width={maskWidth} height={maskHeight} href={dataURL} />
    </mask>
  );
};

const RenderedLayer = ({layer}: RenderedLayerProps) => {
  const { children, hidden, canvas, opacity, text } = layer;
  const isGroup = !!children, isText = false && !!text;

  // All hooks must come before early out.
  const id = `layer-${React.useId()}`;
  const imageDataURL = useCanvasDataUrl(isGroup ? undefined : canvas);
  const maskDataURL = useCanvasDataUrl(layer.mask?.canvas);

  // console.log('render', layer.name, layer);

  // Early out for hidden layers.
  if(hidden) { return null; }

  const left = layer.left ?? 0, top = layer.top ?? 0;
  const width = (layer.right ?? 0) - left, height = (layer.bottom ?? 0) - top;

  const filterId = `${id}-filter`;
  const filter = renderFilter(filterId, layer);

  const maskId = `${id}-mask`;
  const mask = renderMask(maskId, layer, maskDataURL);

  if(isText) {
    console.log(layer.name, layer);
  }

  return <>
    { filter }
    { mask }
    <g
      id={id}
      opacity={opacity}
      filter={filter ? `url(#${filterId})` : ''}
      mask={mask ? `url(#${id}-mask)` : ''}
    >
      { !isGroup && !isText &&
        <image
          id={`${id}-content`}
          x={left} y={top}
          href={imageDataURL}
        />
      }
      {
        !isGroup && isText &&
        <text
          id={`${id}-content`}
          x={left} y={top}
        >{text?.text}</text>
      }
      {
        isGroup &&
        children.map((childLayer, idx) => <RenderedLayer layer={childLayer} key={idx} />)
      }
    </g>
  </>;
};

interface RenderedPsdProps {
  psd: Psd;
}

const RenderedPsd = ({psd}: RenderedPsdProps) => {
  return (
    <svg viewBox={`0 0 ${psd.width} ${psd.height}`} width={psd.width} height={psd.height}>
    {(psd.children || []).map((layer, idx) => <RenderedLayer layer={layer} key={idx} />)}
    </svg>
  );
};

export default RenderedPsd;
