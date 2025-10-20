import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import OpenWithDialog, { type BrowserProfile } from '../OpenWithDialog';

const browsers: BrowserProfile[] = [
  { id: 'b1', name: 'Chrome', profile: 'Personal' },
  { id: 'b2', name: 'Firefox', profile: 'Work' },
];

describe('OpenWithDialog (accessibility + keyboard)', () => {
  it('moves focus to first radio and traps focus, closes on ESC and backdrop', async () => {
  const onChoose = jest.fn();
  const onClose = jest.fn();

  const user = userEvent.setup();
  render(<OpenWithDialog open={true} onClose={onClose} browsers={browsers} onChoose={onChoose} />);

  const radios = screen.getAllByRole('radio');
  const firstRadio = radios[0];
  expect(firstRadio).toHaveFocus();

  await user.tab();
  await user.tab();
  await user.tab();
  expect(firstRadio).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
  });

  it('has no detectable axe accessibility violations', async () => {
    const { container } = render(<OpenWithDialog open={true} browsers={browsers} onChoose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
