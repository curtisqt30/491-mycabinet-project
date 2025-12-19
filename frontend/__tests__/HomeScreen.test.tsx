
//fixed test now works 
import type React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from '@/app/(tabs)/home';

//  icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

//  router
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

//  contexts
jest.mock('@/app/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', display_name: 'Tester', avatar_url: null },
  }),
}));

jest.mock('@/app/lib/DrinksContext', () => ({
  useDrinks: () => ({
    drinks: [{ id: '1', name: 'Mojito', thumbUrl: 'thumb.png' }],
    loading: false,
    initialized: true,
    refreshDrinks: jest.fn(),
  }),
}));

jest.mock('@/app/lib/useFavorites', () => ({
  useFavorites: () => ({
    items: [],
    toggle: jest.fn(),
  }),
}));

// Child component mocks
jest.mock('@/components/ui/CocktailGrid', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>CocktailGrid</Text>;
});
jest.mock('@/components/ui/SkeletonCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>SkeletonCard</Text>;
});
jest.mock('@/components/ui/NavigationDrawer', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>NavigationDrawer</Text>;
});

// Helper to render with SafeAreaProvider
const renderWithSafeArea = (ui: React.ReactElement) =>
  render(<SafeAreaProvider>{ui}</SafeAreaProvider>);

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = renderWithSafeArea(<HomeScreen />);
    expect(toJSON()).toBeTruthy();
  });


});

