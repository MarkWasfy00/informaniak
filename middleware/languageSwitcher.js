module.exports = (req, res, next) => {
  try {
    const lang = req.query.lang || (req.cookies && req.cookies.locale) || 'en';
    res.cookie('locale', lang, { maxAge: 900000, httpOnly: true });
    req.setLocale(lang);
    console.log(`Language set to: ${lang}`);
  } catch (error) {
    console.error(`Error in languageSwitcher middleware: ${error.message}`);
    console.error(error.stack);
  }
  next();
};