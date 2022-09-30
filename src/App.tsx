import React from 'react';
import { readPsd, Psd, Layer } from 'ag-psd';

import RenderedPsd from './RenderedPsd';

import { updateTextLayer } from './textLayer';

import logo from './logo.svg';
import './App.css';

const psdWithReplacedLayer = (psd: Psd, oldLayer: Layer, newLayer: Layer): Psd => {
  const mapChildren = (children: Layer[]): Layer[] => children.map(layer => {
    if(layer === oldLayer) { return newLayer; }
    if(layer.children) { return {...layer, children: mapChildren(layer.children)}; }
    return layer;
  });
  return { ...psd, children: psd.children && mapChildren(psd.children) };
};

// Return a flattened list of non-hidden layers
const psdLayers = (psd: Psd): Layer[] => {
  const layerOrChildren = (layer: Layer) : Layer | Layer[] => {
    return layer.children ? layer.children.filter(({ hidden }) => !hidden).map(layerOrChildren).flat() : layer;
  };
  return (psd.children ?? []).map(layerOrChildren).flat();
};

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [psd, setPsd] = React.useState<Psd>();

  React.useEffect(() => {
    if(!psd?.canvas || !canvasRef.current) { return; }
    canvasRef.current.width = psd.width;
    canvasRef.current.height = psd.height;
    const ctx = canvasRef.current.getContext('2d');
    if(ctx) {
      ctx.drawImage(psd.canvas, 0, 0);
    }
  }, [canvasRef, psd?.canvas, psd?.height, psd?.width]);

  const onFileChange = async ({ target: { files } }: React.ChangeEvent<HTMLInputElement>) => {
    if((files === null) || (!files[0])) { return; }
    setPsd(readPsd(await files[0].arrayBuffer()));
  }

  const handleLayerInput = (layer: Layer, event: React.FormEvent<HTMLTextAreaElement>) => {
    const { target } = event;
    const { value } = target as HTMLTextAreaElement;
    if(psd) {
      setPsd(psdWithReplacedLayer(psd, layer, updateTextLayer(layer, value)));
    }
  };

  const layers: Layer[] = psd ? psdLayers(psd) : [];
  const textLayers = layers.filter(({ text }) => text);

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" onChange={ onFileChange } />
        { psd && <RenderedPsd psd={psd} /> }
        { textLayers.map((layer, idx) => (
          <textarea
            onInput={event => handleLayerInput(layer, event)}
            key={idx} cols={80} rows={`${layer?.text?.text}`.split(/\r\n|\r|\n/).length}
            value={layer?.text?.text}
          />
        )) }
        <h1>PSD rendered preview</h1>
        <canvas ref={canvasRef} />
      </header>
    </div>
  );
}

export default App;
