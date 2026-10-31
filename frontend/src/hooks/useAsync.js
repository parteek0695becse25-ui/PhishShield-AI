import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async function on mount and whenever deps change. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const counter = useRef(0);

  const run = useCallback(() => {
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then((data) => { if (id === counter.current) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (id === counter.current) setState({ data: null, loading: false, error }); });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); return () => { counter.current += 1; }; }, deps);

  return { ...state, reload: run };
}
