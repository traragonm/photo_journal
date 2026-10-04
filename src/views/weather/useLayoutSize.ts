import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Size of a view from its onLayout (0 × 0 until laid out). */
export function useLayoutSize(): [{ width: number; height: number }, (event: LayoutChangeEvent) => void] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);
  return [size, onLayout];
}
