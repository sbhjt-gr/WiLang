import * as Crypto from 'expo-crypto';

if (typeof global.crypto === 'undefined') {
  global.crypto = {} as any;
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = function(array: Uint8Array): Uint8Array {
    const randomBytes = Crypto.getRandomBytes(array.length);
    array.set(randomBytes);
    return array;
  };
}

export {};
