import { Stack } from 'expo-router';

export default function SearchStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: 'systemMaterial',
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  );
}
