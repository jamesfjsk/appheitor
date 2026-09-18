import React from 'react';
import { X } from 'lucide-react';

type Wide = 'sm' | 'md' | 'lg' | 'xl';

const WIDE: Record<Wide, string> = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
};

const ChildSheet: React.FC<{
  onClose: () => void;
  title?: React.ReactNode;
  header?: React.ReactNode;
  tabs?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: Wide;
  className?: string;
  veilClass?: string;
  children: React.ReactNode;
}> = ({
  onClose, title, header, tabs, footer, wide = 'lg', className, veilClass = 'mn-veil', children,
}) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${veilClass}`} onClick={onClose}>
    <div
      className={`mc-modal mc-pop mn-child-sheet rounded-lg w-full ${WIDE[wide]} ${className || ''} text-white`}
      onClick={(e) => e.stopPropagation()}
    >
      {(header || title) && (
        <div className="shrink-0">
          {header || (
            <div className="mn-wood-head flex justify-between items-center gap-2">
              <h2 className="mc-title text-sm min-w-0 truncate">{title}</h2>
              <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0 shrink-0" onClick={onClose} aria-label="Fechar">
                <X />
              </button>
            </div>
          )}
        </div>
      )}
      {tabs ? <div className="shrink-0">{tabs}</div> : null}
      <div className="mn-child-body">{children}</div>
      {footer ? <div className="mn-child-foot">{footer}</div> : null}
    </div>
  </div>
);

export default ChildSheet;
