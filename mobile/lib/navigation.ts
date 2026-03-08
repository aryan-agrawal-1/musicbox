import { Colors } from '@/constants/colors';


 // Shared Stack screenOptions used by all tab navigators and the shared stack.
 
export const sharedStackOptions = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeTitle: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleStyle: { color: Colors.textPrimary },
  headerLargeTitleStyle: { color: Colors.textPrimary },
  contentStyle: { backgroundColor: Colors.background },
};

export const rateScreenOptions = {
  headerShown: false,
  headerLargeTitle: false,
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.55, 1.0],
  contentStyle: { backgroundColor: 'transparent' },
} as const;
