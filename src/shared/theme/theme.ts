import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily:
    '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  headings: {
    fontFamily:
      '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: rem(8),
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius: rem(8),
      },
    },
  },
});
