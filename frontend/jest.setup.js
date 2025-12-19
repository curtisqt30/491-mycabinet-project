if (!Object.getOwnPropertyDescriptor(globalThis, '__ExpoImportMetaRegistry')) {
  Object.defineProperty(globalThis, '__ExpoImportMetaRegistry', {
    configurable: true,
    get() {
      return { get: () => undefined, set: () => undefined };
    },
  });
}

// Provide default env var used by app modules during tests
const __JEST_API_BASE__ = 'http://127.0.0.1:8000/api/v1';

if (typeof global.process === 'undefined') {
  // @ts-ignore
  global.process = {};
}

if (typeof global.process.env === 'undefined') {
  // @ts-ignore
  global.process.env = {};
}

if (!global.process.env.EXPO_PUBLIC_API_BASE_URL) {
  global.process.env.EXPO_PUBLIC_API_BASE_URL = __JEST_API_BASE__;
}

// Load centralized mocks (keeps per-test files small and consistent)
// (centralized mocks removed) tests rely on per-test mocks; don't `require` shared mocks here
