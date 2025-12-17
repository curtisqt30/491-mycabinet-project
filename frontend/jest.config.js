module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFiles: [
    'react-native-gesture-handler/jestSetup',
    '<rootDir>/jest.setup.js',
  ],
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo(?:/.*)?$': '<rootDir>/__mocks__/expo.js',
    '^expo-modules-core$': '<rootDir>/__mocks__/expo-modules-core.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^expo-linking$': '<rootDir>/__mocks__/expo-linking.js',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|react-clone-referenced-element' +
      '|@react-navigation' +
      '|@expo' +
      '|expo(nent)?' +
      '|@expo(nent)?/.*' +
      '|expo-.*' +
      '|@expo-.*' +
      '|react-native-.*' +
      '|@testing-library/react-native' +
      ')/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
