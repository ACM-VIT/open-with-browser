import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Combobox } from '../components/ui/Select';

describe('Combobox keyboard interactions', () => {
  const options = [
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
    { value: '3', label: 'Three' },
  ];

  it('opens with ArrowDown/Enter and lets you search, commit custom entry with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox options={options} value={''} onChange={onChange} />);

    const trigger = screen.getByRole('combobox');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const input = screen.getByRole('textbox');
    await user.type(input, 'CustomName');

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('CustomName');
  });

  it('navigates filtered options with Arrow keys and selects with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox options={options} value={''} onChange={onChange} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const input = screen.getByRole('textbox');
    await user.type(input, 'T');

    await user.keyboard('{ArrowDown}');
    const two = screen.getByRole('option', { name: 'Two' });
    expect(two).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('Two');
  });
});
