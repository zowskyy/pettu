/** Minimal Expo global for expo-modules-core in node tests. */
class EventEmitter {
  addListener() {
    return { remove: () => undefined };
  }
  removeListener() {
    return undefined;
  }
  removeAllListeners() {
    return undefined;
  }
  emit() {
    return false;
  }
}

(globalThis as { expo?: { EventEmitter: typeof EventEmitter } }).expo = {
  EventEmitter,
};
