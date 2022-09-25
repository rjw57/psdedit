import React from 'react';
import { readPsd, Psd as AgPsd } from 'ag-psd';

import RenderedPsd from './RenderedPsd';

import logo from './logo.svg';
import './App.css';

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [psd, setPsd] = React.useState<AgPsd>();

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

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" onChange={ onFileChange } />
        { psd && <RenderedPsd psd={psd} /> }
        <canvas ref={canvasRef} />
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
