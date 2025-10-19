import { useState } from 'react';

export type BrowserProfile = {
  id: string;
  name: string;
  icon?: string;
  profile?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  browsers: BrowserProfile[];
  onChoose: (browser: BrowserProfile, persist: 'just-once' | 'always') => void;
};

export default function OpenWithDialog({
  open,
  onClose,
  browsers,
  onChoose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(
    browsers[0]?.id ?? null
  );

  if (!open) return null;

  const handleChoose = (persist: 'just-once' | 'always') => {
    const b = browsers.find(b => b.id === selected);
    if (b) onChoose(b, persist);
  };

  return (
    <div className='owd-backdrop'>
      <div className='owd-dialog' role='dialog' aria-modal='true'>
        <button aria-label='Close' className='owd-close' onClick={onClose}>
          ×
        </button>
        <h2>Open with</h2>
        <p>Select a browser to open this link:</p>

        <div className='owd-list'>
          {browsers.map(b => (
            <label
              className={`owd-item ${selected === b.id ? 'selected' : ''}`}
              key={b.id}
            >
              <input
                type='radio'
                name='owd-browser'
                value={b.id}
                checked={selected === b.id}
                onChange={() => setSelected(b.id)}
              />
              <div className='owd-meta'>
                <div className='owd-icon'>
                  {b.icon ? <img src={b.icon} alt='' /> : '🌐'}
                </div>
                <div className='owd-text'>
                  <div className='owd-name'>{b.name}</div>
                  {b.profile ? (
                    <div className='owd-profile'>{b.profile}</div>
                  ) : null}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className='owd-actions centered'>
          <div className='owd-choose'>
            <button onClick={() => handleChoose('just-once')}>Just once</button>
            <button
              className='owd-primary'
              onClick={() => handleChoose('always')}
            >
              Always
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
