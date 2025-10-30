import React from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * NavigationWrapper - изолирует навигацию для read-only view
 * Использует MemoryRouter чтобы навигация работала только внутри view
 */
function NavigationWrapper({ children, basePath }) {
  return (
    <MemoryRouter initialEntries={[basePath || '/']} initialIndex={0}>
      {children}
    </MemoryRouter>
  );
}

export default NavigationWrapper;
