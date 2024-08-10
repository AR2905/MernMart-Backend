const passport = require('passport');

exports.isAuth = (req, res, done) => {
  return passport.authenticate('jwt');
};

exports.sanitizeUser = (user) => {
  return { id: user.id, role: user.role };
};

exports.cookieExtractor = function (req) {
  let token = null;
  
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  // token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTg0ZTI4NzhlNzRmMTBkNGE1MzJiYyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzIyMzM3MDExfQ.Pe-N6E3X4BK6_5m23jCSJEnI4iw8p9cpNnGYC27aE7g"
  //TODO : this is temporary token for testing without cookie
  return token;
};