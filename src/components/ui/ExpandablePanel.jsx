import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * ExpandablePanel — wraps any panel with an expand-to-fullscreen button.
 * When expanded, renders a fullscreen modal overlay containing the same content.
 */
export default function ExpandablePanel({ title, note, children, className = '' }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`panel ${className}`}>
        <div className="panel-head">
          <div>
            <h3>{title}</h3>
            {note && <p>{note}</p>}
          </div>
          <button
            className="icon-btn"
            onClick={() => setExpanded(true)}
            title="Expand to fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
        {children}
      </div>

      {expanded && (
        <div className="fullscreen-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
          <div className="fullscreen-panel">
            <div className="fullscreen-head">
              <div>
                <h2>{title}</h2>
                {note && <p>{note}</p>}
              </div>
              <button
                className="icon-btn"
                onClick={() => setExpanded(false)}
                title="Close fullscreen"
              >
                <Minimize2 size={18} />
              </button>
            </div>
            <div className="fullscreen-body">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
