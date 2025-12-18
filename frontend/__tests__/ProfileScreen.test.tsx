import React from 'react';
import { render } from '@testing-library/react-native';

<<<<<<< HEAD
//  Mock Safe Area (this one is REQUIRED)
=======
// Area (this one is REQUIRED)
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));


<<<<<<< HEAD
//  Router
=======
// Router
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

<<<<<<< HEAD
//  Icons
=======
// icons
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

<<<<<<< HEAD
//  Contexts
=======
// contexts
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
jest.mock('@/app/lib/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'test@example.com',
      display_name: 'Tester',
      avatar_url: null,
    },
  }),
}));

jest.mock('@/app/lib/useFavorites', () => ({
  useFavorites: () => ({
    items: [],
  }),
}));

<<<<<<< HEAD
//  Child components
=======
//  child components
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
jest.mock('@/components/ui/FormButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ title }: any) => <Text>{title}</Text>;
});

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

<<<<<<< HEAD
// AFTER ALL MOCKS
=======
//  AFTER ALL MOCKS
>>>>>>> f3f2c15146ce3619550d72cde4a835fe11b79583
import ProfileScreen from '@/app/(tabs)/profile';

describe('ProfileScreen (RTL, stable)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows user info', () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Tester')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByText('Favorites')).toBeTruthy();
    expect(getByText('Favorite Drinks')).toBeTruthy();
  });
});
