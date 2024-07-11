const path = require('path');
const i18n = require('i18n');

i18n.configure({
  locales: ['en', 'fr'],
  directory: path.join(__dirname, '../locales'),
  defaultLocale: 'en',
  cookie: 'locale',
  queryParameter: 'lang',
  autoReload: true,
  syncFiles: true,
  objectNotation: true
});

module.exports = i18n;