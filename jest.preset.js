const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,

  // print coverage to console
  // https://github.com/nrwl/nx/issues/1337
  // Note: 202304: causes "Validation Warning" but works
  coverageReporters: ['html', 'text'],
};
