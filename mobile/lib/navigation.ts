import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Colors } from '@/constants/colors';


 // Shared Stack screenOptions used by all tab navigators and the shared stack.
 
export const sharedStackOptions: NativeStackNavigationOptions = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeTitle: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleStyle: { color: Colors.textPrimary },
  headerLargeTitleStyle: { color: Colors.textPrimary },
  contentStyle: { backgroundColor: Colors.background },
};

export const rateScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  headerLargeTitle: false,
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.55, 1.0] as number[],
  contentStyle: { backgroundColor: 'transparent' },
};

export const sharePreviewScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  headerLargeTitle: false,
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.68, 1.0] as number[],
  contentStyle: { backgroundColor: 'transparent' },
};
