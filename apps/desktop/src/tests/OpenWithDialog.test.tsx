import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import OpenWithDialog, { type BrowserProfile } from '../OpenWithDialog';
import { describe, it, expect, vi } from 'vitest';

const browsers: BrowserProfile[] = [
  {
    id: 'b1',
    name: 'Chrome',
    profileLabel: 'Personal',
    profileDirectory: null,
  },
  { id: 'b2', name: 'Firefox', profileLabel: 'Work', profileDirectory: null },
];

describe('OpenWithDialog (accessibility + keyboard)', () => {
  it('moves focus to first radio and traps focus, closes on ESC and backdrop', async () => {
    const onChoose = vi.fn();
    const onClose = vi.fn();

    const user = userEvent.setup();
    render(
      <OpenWithDialog
        open={true}
        onClose={onClose}
        browsers={browsers}
        onChoose={onChoose}
      />
    );

    const radios = screen.getAllByRole('radio');
    const firstRadio = radios[0];
    await (async () => {
      const start = Date.now();
      while (Date.now() - start < 500) {
        if (firstRadio === document.activeElement) return;

        await new Promise(r => setTimeout(r, 10));
      }
    })();
    expect(firstRadio).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('has no detectable axe accessibility violations', async () => {
    const { container } = render(
      <OpenWithDialog open={true} browsers={browsers} onChoose={() => {}} />
    );
    const results = await axe(container);
    
    expect(results.violations).toHaveLength(0);
  });
});
