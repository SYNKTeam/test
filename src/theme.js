import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Monaco, monospace',
  headings: {
    fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '700',
  },

  primaryColor: 'teal',

  colors: {
    teal: [
      '#e6fcf7',
      '#c3f5e8',
      '#9feeda',
      '#7be7cb',
      '#5df2d6',
      '#00bfa5',
      '#00a889',
      '#00916e',
      '#007a54',
      '#00633b',
    ],
  },

  defaultRadius: 'md',

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },

    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },

    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },

    Avatar: {
      defaultProps: {
        radius: 'xl',
      },
    },
  },
});
