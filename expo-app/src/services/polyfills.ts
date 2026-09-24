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

// Global Android Text rendering stabilizer (prevents text clipping on Xiaomi, Samsung, OnePlus, Oppo)
import React from 'react';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    const TextModule = require('react-native/Libraries/Text/Text');
    const OriginalText = TextModule && (TextModule.default || TextModule);

    if (OriginalText && !OriginalText.__isPatchedForAndroid) {
      const PatchedText = React.forwardRef((props: any, ref: any) => {
        const { style, children, textBreakStrategy, ...rest } = props;

        // Apply Android stability styles: explicit Roboto system font and includeFontPadding false
        const androidBaseStyle = {
          fontFamily: 'Roboto',
          includeFontPadding: false,
        };

        const mergedStyle = Array.isArray(style)
          ? [androidBaseStyle, ...style]
          : style
          ? [androidBaseStyle, style]
          : androidBaseStyle;

        // Helper to add a non-breaking space (\u00A0) to prevent BoringLayout / MiSans font glyph truncation
        // Using \u00A0 ensures the space can NEVER break into a second line
        const sanitizeChild = (val: any): any => {
          if (typeof val === 'string') {
            if (val.length === 0 || val.endsWith(' ') || val.endsWith('\u00A0')) {
              return val;
            }
            return val + '\u00A0';
          }
          if (typeof val === 'number') {
            return String(val) + '\u00A0';
          }
          return val;
        };

        let safeChildren = children;
        if (typeof children === 'string' || typeof children === 'number') {
          safeChildren = sanitizeChild(children);
        } else if (Array.isArray(children)) {
          safeChildren = React.Children.map(children, (child, idx) => {
            if (idx === children.length - 1) {
              return sanitizeChild(child);
            }
            return child;
          });
        }

        return React.createElement(OriginalText, {
          ...rest,
          textBreakStrategy: textBreakStrategy ?? 'simple',
          style: mergedStyle,
          ref,
          children: safeChildren,
        });
      });

      (PatchedText as any).displayName = 'PatchedAndroidText';
      (PatchedText as any).__isPatchedForAndroid = true;
      Object.assign(PatchedText, OriginalText);

      // Overwrite module export
      if (TextModule.default) {
        TextModule.default = PatchedText;
      }

      // Overwrite react-native export
      try {
        const ReactNative = require('react-native');
        if (ReactNative) {
          Object.defineProperty(ReactNative, 'Text', {
            configurable: true,
            enumerable: true,
            get: () => PatchedText,
          });
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[@OficinaPro] Android font stabilizer initialization warning:', err);
  }
}

export {};

