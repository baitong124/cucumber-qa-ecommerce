// Cucumber-JS configuration (CommonJS).
// Runs TypeScript step definitions/support via ts-node and emits HTML + progress reports.
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'summary',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    // Fail fast is intentionally OFF so the whole suite reports in one run.
    parallel: 0,
    retry: 0,
  },
  // Stable CI profile: 2 parallel workers, 1 retry to absorb transient network flake.
  ci: {
    requireModule: ['ts-node/register'],
    require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: ['html:reports/cucumber-report.html', 'json:reports/cucumber-report.json'],
    formatOptions: { snippetInterface: 'async-await' },
    parallel: 2,
    retry: 1,
  },
};
