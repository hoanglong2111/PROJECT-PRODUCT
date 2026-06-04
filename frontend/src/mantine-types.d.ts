/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import type { MantineColorsTuple, MantineThemeColors } from '@mantine/core';

declare module '@mantine/core' {
  export type { MantineColorsTuple, MantineThemeColors };
}
