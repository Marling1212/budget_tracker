import { useRef } from 'react';

export function useDoubleTap(onDoubleTap: () => void, delay = 300) {
  const lastTapRef = useRef<number>(0);

  const handlePress = () => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < delay) {
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return handlePress;
}
