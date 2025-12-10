import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  } else if (navigationRef.isReady()) {
    (navigationRef as any).reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }
}

export function resetToHome() {
  if (navigationRef.isReady()) {
    (navigationRef as any).reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }
}

export function replace(name: string, params?: any) {
  if (navigationRef.isReady()) {
    (navigationRef as any).replace(name, params);
  }
}
