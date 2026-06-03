// Self-contained DOMException polyfill for React Native Hermes and Web compatibility
if (typeof global.DOMException === 'undefined' || typeof globalThis.DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    code: number;
    constructor(message = 'The operation was aborted.', name = 'AbortError') {
      super(message);
      this.name = name;
      this.code = name === 'AbortError' ? 20 : 0;
    }
  }

  (global as any).DOMException = DOMExceptionPolyfill;
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).DOMException = DOMExceptionPolyfill;
  }
}
export {};
