import { defineConfig, devices } from "@playwright/test";
const externalServer = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false,
  use: {baseURL: externalServer ?? "http://127.0.0.1:3100", trace: "retain-on-failure"},
  projects: [{name: "desktop", use: {...devices["Desktop Chrome"]}}, {name: "mobile", use: {...devices["iPhone 13"], defaultBrowserType: "chromium"}}],
  webServer: externalServer ? undefined : {command: "npm run dev -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: !process.env.CI, timeout: 120000},
});
