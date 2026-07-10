import { createContext, useContext, useState, useCallback } from 'react';
import { demoState } from '../utils/demoData';

const AppContext = createContext(null);

const initialState = {
  state: null,
  view: 'command',
  entity: 'budget',
  master: 'users',
  filters: { company: '', brandKey: '', startDate: '', endDate: '', year: '' },
  rows: {},
  error: '',
};

export function AppProvider({ children }) {
  const [app, setApp] = useState(initialState);

  const update = useCallback((patch) => {
    setApp((prev) => ({ ...prev, ...patch }));
  }, []);

  const setView = useCallback((view) => update({ view }), [update]);
  const setEntity = useCallback((entity) => update({ entity }), [update]);
  const setMaster = useCallback((master) => update({ master }), [update]);
  const setFilters = useCallback((filters) => update({ filters }), [update]);
  const setRows = useCallback((entity, rows) => {
    setApp((prev) => ({ ...prev, rows: { ...prev.rows, [entity]: rows } }));
  }, []);
  const setState = useCallback((state) => update({ state }), [update]);

  const loadDemo = useCallback(() => {
    const ds = demoState();
    update({ state: ds, error: '' });
  }, [update]);

  return (
    <AppContext.Provider
      value={{
        app,
        setView,
        setEntity,
        setMaster,
        setFilters,
        setRows,
        setState,
        loadDemo,
        update,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
