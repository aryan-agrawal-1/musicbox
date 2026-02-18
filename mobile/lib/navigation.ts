import { Colors } from '@/constants/colors';


 // Shared Stack screenOptions used by all tab navigators and the shared stack.
 
export const sharedStackOptions = {
  headerTransparent: true,
  headerBlurEffect: 'systemUltraThinMaterialDark',
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeTitle: true,
  headerBackButtonDisplayMode: 'minimal',
  headerTitleStyle: { color: Colors.textPrimary },
  headerLargeTitleStyle: { color: Colors.textPrimary },
  contentStyle: { backgroundColor: Colors.background },
};
