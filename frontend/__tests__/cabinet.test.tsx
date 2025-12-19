import React from 'react';
import { render ,  waitFor } from '@testing-library/react-native';



import CabinetScreen from '@/app/(tabs)/cabinet';


jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

//  stack header config only
jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

//screen loads on mount
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
}));



jest.mock('@/components/ui/MenuButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>MenuButton</Text>;
});

jest.mock('@/components/ui/NavigationDrawer', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>NavigationDrawer</Text>;
});
//changes made 
// My-ingredients components
jest.mock('@/components/my-ingredients/Chip', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ label }: any) => <Text>{label}</Text>;
});

jest.mock('@/components/my-ingredients/Tab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ label }: any) => <Text>{label}</Text>;
});

jest.mock('@/components/my-ingredients/Searchbar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>SearchBar</Text>;
});

jest.mock('@/components/my-ingredients/Toast', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ text }: any) => <Text>{text}</Text>;
});

jest.mock('@/components/my-ingredients/ActionSheet', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>ActionSheet</Text>;
});

jest.mock('@/components/my-ingredients/CabinetRow', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ item }: any) => <Text>{item?.name ?? 'CabinetRow'}</Text>;
});

jest.mock('@/components/my-ingredients/ShoppingRow', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ item }: any) => <Text>{item?.name ?? 'ShoppingRow'}</Text>;
});

// Utils
jest.mock('@/app/utils/ingredientCatalog', () => ({
  loadIngredientCatalog: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/app/utils/normalize', () => ({
  normalizeIngredient: (name: string) => ({
    displayName: name,
    canonicalName: name,
  }),
}));

jest.mock('@/app/utils/cocktaildb', () => ({
  ingredientImageUrl: () => '',
}));

// Mock expo secure store native module used by auth utilities
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(null),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock API hook to avoid reading env/config at module load
jest.mock('@/app/lib/useApi', () => ({
  useApi: () => ({
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    del: jest.fn().mockResolvedValue({}),
  }),
}));

// Mock auth context hook
jest.mock('@/app/lib/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock auth module to avoid evaluating environment-dependent top-level code
jest.mock('@/app/lib/auth', () => ({
  authFetch: jest.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  })),
  // minimal token helpers if imported elsewhere
  getAccessToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  storeTokens: jest.fn().mockResolvedValue(undefined),
  refreshTokens: jest.fn().mockResolvedValue({
    access_token: 'a',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_in: 3600,
  }),
}));


// test

it('shows main UI text', async () => {
  const { getByText } = render(<CabinetScreen />);

  await waitFor(() => {
    expect(getByText('My Cabinet')).toBeTruthy();
  });

  expect(getByText('Owned (0)')).toBeTruthy();
  expect(getByText('Shopping List (0)')).toBeTruthy();
  expect(getByText('＋')).toBeTruthy();
});

