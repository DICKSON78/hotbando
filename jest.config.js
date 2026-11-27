/**
 * Isolated test configuration.
 *
 * Tests must never connect to the production database or a live MikroTik.
 * All database/router dependencies are mocked in tests/helpers.
 */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    // Never allow a test to accidentally write to logs/ or data/ in the repo.
    testPathIgnorePatterns: ['/node_modules/', '/frontend/node_modules/', '/dist/']
};
