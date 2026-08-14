/** Vitest stub — avoids parsing React Native Flow syntax in node tests. */
export const Platform = { OS: 'android' as const, select: <T>(o: { android?: T; default?: T }) => o.android ?? o.default };
export const Alert = { alert: () => undefined };
export default {};
