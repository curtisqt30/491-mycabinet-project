


// jest.mock('react-native-gesture-handler', () => {
//   const View = require('react-native').View;
//   return {
//     ScrollView: View,
//     TouchableOpacity: View,
//     Pressable: View,
//     Swipeable: View,
//     DrawerLayout: View,
//     State: {},
//     PanGestureHandler: View,
//     GestureHandlerRootView: View,
//   };
// });
//  import { SafeAreaProvider } from 'react-native-safe-area-context';


// import React from 'react';
// import { render } from '@testing-library/react-native';
// import ProfileScreen from '@/app/(tabs)/profile';


// // icons
// jest.mock('@expo/vector-icons', () => ({
//   Ionicons: () => null,
// }));

// // router
// jest.mock('expo-router', () => ({
//   router: { push: jest.fn() },
// }));

// // contexts
// jest.mock('@/app/lib/AuthContext', () => ({
//   useAuth: () => ({
//     user: { email: 'test@example.com', display_name: 'Tester', avatar_url: null },
//   }),
// }));

// jest.mock('@/app/lib/useFavorites', () => ({
//   useFavorites: () => ({
//     items: [],
//   }),
// }));

// // child components
// jest.mock('@/components/ui/FormButton', () => {
//   const React = require('react');
//   const { Text } = require('react-native');
//   return ({ title }) => <Text>{title}</Text>;
// });
// jest.mock('@/components/ui/MenuButton', () => {
//   const React = require('react');
//   const { Text } = require('react-native');
//   return () => <Text>MenuButton</Text>;
// });
// jest.mock('@/components/ui/NavigationDrawer', () => {
//   const React = require('react');
//   const { Text } = require('react-native');
//   return () => <Text>NavigationDrawer</Text>;
// });




// // helper
// const renderWithSafeArea = (ui) =>
//   render(<SafeAreaProvider>{ui}</SafeAreaProvider>);

// describe('ProfileScreen', () => {
//   it('renders without crashing', () => {
//     const { toJSON } = renderWithSafeArea(<ProfileScreen />);
//     expect(toJSON()).toBeTruthy();
//   });

//   it('shows basic user info', () => {
//     const { getByText } = renderWithSafeArea(<ProfileScreen />);
//     expect(getByText('test@example.com')).toBeTruthy();
//     expect(getByText('Edit Profile')).toBeTruthy();
//     expect(getByText('Favorites')).toBeTruthy();
//     expect(getByText('Favorite Drinks')).toBeTruthy();
//   });
// });


import React from 'react';
import { render } from '@testing-library/react-native';

// 🔒 Mock Safe Area (this one is REQUIRED)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));


// 🔒 Router
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// 🔒 Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// 🔒 Contexts
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

// 🔒 Child components
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

// ⬇️ IMPORT AFTER ALL MOCKS
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
