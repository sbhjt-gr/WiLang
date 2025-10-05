import { useEffect } from 'react';
import { DeviceMotion } from 'expo-sensors';
import { useSharedValue, withSpring } from 'react-native-reanimated';

export function useDeviceMotion() {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    const subscription = DeviceMotion.addListener(data => {
      const gamma = data.rotation?.gamma ?? 0;
      const beta = data.rotation?.beta ?? 0;
      tiltX.value = withSpring(gamma * 4, { damping: 12, stiffness: 90 });
      tiltY.value = withSpring(beta * 4, { damping: 12, stiffness: 90 });
    });

    DeviceMotion.setUpdateInterval(16);

    return () => {
      subscription.remove();
    };
  }, [tiltX, tiltY]);

  return { tiltX, tiltY };
}
