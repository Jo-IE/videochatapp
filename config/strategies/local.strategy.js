var passport = require('passport');
var {Strategy} = require('passport-local');
var User = require('../../models/users');

module.exports = function localStrategy(){
    passport.use(new Strategy(
        {
          usernameField: 'username',
          passwordField: 'password'
        },
        (username, password, done ) => {
            User.findOne({ username: username }, function (err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false); }
                if (user.password != password) { return done(null, false); }
                return done(null, user);
            }
            )}
    ))

    
}