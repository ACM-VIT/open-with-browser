import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Select } from '../components/ui/Select';

describe('Select keyboard interactions', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo', disabled: true },
    { value: 'c', label: 'Charlie' },
  ];

  it('opens with Enter and Space and closes with Escape, focuses trigger after close', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select options={options} value={undefined} onChange={onChange} />);

    const trigger = screen.getAllByRole('button')[0];

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();

    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('navigates options with ArrowDown/ArrowUp skipping disabled options and commits with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select options={options} onChange={onChange} />);

    const trigger = screen.getAllByRole('button')[0];

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const alpha = screen.getByRole('option', { name: 'Alpha' });
    expect(alpha).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    const charlie = screen.getByRole('option', { name: 'Charlie' });
    expect(charlie).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('c');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
