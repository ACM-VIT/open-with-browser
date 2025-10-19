import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import OpenWithDialog, { BrowserProfile } from '../OpenWithDialog';

export default function Dashboard() {
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
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p>Welcome to the Open With Browser application. Test the browser selection dialog below.</p>

      <div className="dashboard-section">
        <h3>Test Browser Selection</h3>
        <form
          className="row"
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
      </div>

      <OpenWithDialog
        open={open}
        onClose={() => setOpen(false)}
        browsers={mockBrowsers}
        onChoose={handleChoose}
      />
    </div>
  );
}
