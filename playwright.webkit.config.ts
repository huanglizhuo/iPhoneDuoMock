import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  outputDir: 'test-results/webkit',
  reporter: [['list']],
  grep: /browser masks|both workspaces|browser fold|EchoPod source|live browser|five poses|project round|missing content|responsive workbench|right screen|projected artwork|vertical display edges|inner upload supplies|screen upload selectors|fold slider preserves|EchoPod demo/,
  use: { ...base.use, browserName: 'webkit', launchOptions: {} },
});
