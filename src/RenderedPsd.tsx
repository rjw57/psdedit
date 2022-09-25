import * as React from 'react';
import { Psd, Layer, RGB } from 'ag-psd';

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
  let filterChainResult = 'SourceGraphic';

  // Early out for no effects.
  if(!effects) { return null; }

  // Stroke effects
  effects.stroke?.filter(({ enabled }) => enabled).forEach(stroke => {
    const { size } = stroke;

    // TODO: RGBA, HSL, LAB, CMYK and Grayscale
    const color = stroke.color as RGB;

    console.log('stroke', layer.name, stroke, color);
    const filterId = `filter-${filters.length}`;
    filters.push(
      <feColorMatrix
        in={filterChainResult}
        result={`${filterId}-alphaOnly`}
        key={`${filterId}-alphaOnly`}
        type="matrix"
        values={`0 0 0 0 ${color.r / 255}
                 0 0 0 0 ${color.g / 255}
                 0 0 0 0 ${color.b / 255}
                 0 0 0 1 0`}
      />
    );
    filters.push(
      <feMorphology
        in={`${filterId}-alphaOnly`}
        operator="dilate" radius={size?.value ?? 0}
        result={`${filterId}-erode`}
        key={`${filterId}-erode`}
      />
    );
    filters.push(
      <feMerge
        result={`${filterId}-result`}
        key={`${filterId}-result`}
      >
        <feMergeNode in={`${filterId}-erode`} />
        <feMergeNode in={filterChainResult} />
      </feMerge>
    );
    filterChainResult = `${filterId}-result`;
  });

  if(filters.length === 0) { return null; }
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
  console.log('render', layer.name, layer);

  const { children, hidden, canvas, opacity } = layer;
  const isGroup = !!children;

  // All hooks must come before early out.
  const id = `layer-${React.useId()}`;
  const imageDataURL = useCanvasDataUrl(isGroup ? undefined : canvas);
  const maskDataURL = useCanvasDataUrl(layer.mask?.canvas);

  // Early out for hidden layers.
  if(hidden) { return null; }

  const left = layer.left ?? 0, top = layer.top ?? 0;
  const width = (layer.right ?? 0) - left, height = (layer.bottom ?? 0) - top;

  const filterId = `${id}-filter`;
  const filter = renderFilter(filterId, layer);

  const maskId = `${id}-mask`;
  const mask = renderMask(maskId, layer, maskDataURL);

  return <>
    { filter }
    { mask }
    <g
      id={id}
      opacity={opacity}
      filter={filter ? `url(#${filterId})` : ''}
      mask={mask ? `url(#${id}-mask)` : ''}
    >
      { !isGroup &&
        <image
          id={`${id}-content`}
          x={left} y={top} width={width} height={height}
          href={imageDataURL}
        />
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
  console.log(psd);
  return (
    <svg viewBox={`0 0 ${psd.width} ${psd.height}`} width={psd.width} height={psd.height}>
    {(psd.children || []).map((layer, idx) => <RenderedLayer layer={layer} key={idx} />)}
    </svg>
  );
};

export default RenderedPsd;
