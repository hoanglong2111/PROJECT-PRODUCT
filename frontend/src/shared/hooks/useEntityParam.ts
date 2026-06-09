import { useSearchParams } from 'react-router-dom';

export type EntityParamKey = 'pr' | 'po' | 'do' | 'task' | 'shp';

type EntityParamOptions = {
  clear?: EntityParamKey[];
};

export function useEntityParam(key: EntityParamKey) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);

  const open = (id: string, options: EntityParamOptions = {}) => {
    const nextParams = new URLSearchParams(params);
    options.clear?.forEach((paramKey) => nextParams.delete(paramKey));
    nextParams.set(key, id);
    setParams(nextParams, { replace: value === id });
  };

  const close = (options: EntityParamOptions = {}) => {
    const nextParams = new URLSearchParams(params);
    nextParams.delete(key);
    options.clear?.forEach((paramKey) => nextParams.delete(paramKey));
    setParams(nextParams, { replace: true });
  };

  return { close, open, value };
}
