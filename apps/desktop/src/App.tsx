import { useState } from 'react';
import reactLogo from './assets/react.svg';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import OpenWithDialog, { BrowserProfile } from './OpenWithDialog';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const mockBrowsers: BrowserProfile[] = [
    { id: 'chrome', name: 'Google Chrome', icon: '', profile: 'Personal' },
    { id: 'edge', name: 'Microsoft Edge', icon: '', profile: 'Work' },
    { id: 'firefox', name: 'Firefox', icon: '', profile: null },
  ];

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke('greet', { name }));
  }

  function handleChoose(b: BrowserProfile, persist: 'just-once' | 'always') {
    setOpen(false);
    setResult(
      `${b.name}${b.profile ? ` (${b.profile})` : ''} — ${
        persist === 'always' ? 'Always' : 'Just once'
      }`
    );
  }

  return (
    <main className='container'>
      <h1>Welcome to Tauri + React</h1>

      <div className='row'>
        <a href='https://vite.dev' target='_blank' rel='noreferrer'>
          <img src='/vite.svg' className='logo vite' alt='Vite logo' />
        </a>
        <a href='https://tauri.app' target='_blank' rel='noreferrer'>
          <img src='/tauri.svg' className='logo tauri' alt='Tauri logo' />
        </a>
        <a href='https://react.dev' target='_blank' rel='noreferrer'>
          <img src={reactLogo} className='logo react' alt='React logo' />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className='row'
        onSubmit={e => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id='greet-input'
          onChange={e => setName(e.currentTarget.value)}
          placeholder='Enter a name...'
        />
        <button type='submit'>Greet</button>
      </form>

      <p>{greetMsg}</p>

      <div style={{ marginTop: 20 }} className='row'>
        <button onClick={() => setOpen(true)}>Open With</button>
      </div>

      {result ? <p style={{ marginTop: 12 }}>Last choice: {result}</p> : null}

      <OpenWithDialog
        open={open}
        onClose={() => setOpen(false)}
        browsers={mockBrowsers}
        onChoose={handleChoose}
      />
    </main>
  );
}

export default App;
