import type { ReactNode } from 'react';

import './phone-frame.css';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-stage">
      <div className="phone-body">
        <div className="phone-buttons" aria-hidden="true">
          <i className="phone-action" />
          <i className="phone-volume-up" />
          <i className="phone-volume-down" />
          <i className="phone-power" />
        </div>
        <div className="phone-display">
          <div className="phone-top" aria-hidden="true">
            <span className="phone-island" />
          </div>
          <div className="phone-viewport">
            <div className="phone-scroll" data-phone-scroll>
              {children}
            </div>
          </div>
          <div className="phone-bottom" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
