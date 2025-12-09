import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Todo title', () => {
  render(<App />);
  const heading = screen.getByText(/Todo/i);
  expect(heading).toBeInTheDocument();
});
