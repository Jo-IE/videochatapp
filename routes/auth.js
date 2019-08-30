const express = require("express");
const { MongoClient } = require("mongoose");
const debug = require("debug")("app:auth");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { sanitizeBody } = require("express-validator");
const User = require("../models/users");
const passport = require("passport");

router.post("/signUp", [
  //validate form input
  body("username", "Username is a required field")
    .isLength({ min: 1 })
    .trim(),
  body("password", "Password is a required field")
    .isLength({ min: 1 })
    .trim(),

  //sanitize fields
  sanitizeBody("*").escape(),

  function(req, res, next) {
    const errors = validationResult(req);

    var user = new User({
      username: req.body.username,
      password: req.body.password
    });

    if (!errors.isEmpty()) {
      res.render("index", { user: user, errors: errors.array() });
    } else {
      User.findOne({ username: req.body.username }, function(err, result) {
        if (err) {
          return next(err);
        }
        if (result != null) {
          res.render("index", {
            user: user,
            userexists: "This username is taken"
          });
        } else {
          user.save(function(err) {
            if (err) {
              return next(err);
            }

            req.login(req.body, () => {
              res.redirect("/auth/" + user.username);
            });
          });
        }
      });
    }
  }
]);

router.get("/signIn", function(req, res, next) {
  res.render("signin", { title: "Sign In" });
});

router.post(
  "/signIn",
  passport.authenticate("local", {
    failureRedirect: "/auth/signIn"
  }),
  function(req, res) {
    res.redirect("/auth/" + req.body.username);
  }
);
router.get("/signOut", function(req, res, next) {
  req.logout();
  res.redirect("/");
});

router.all("/:username", function(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect("/");
  }
});

router.get("/:username", function(req, res, next) {
  User.findOne({ username: req.params.username }, (err, result) => {
    if (err) {
      return next(err);
    }
    if (result == null) {
      res.render("signIn");
    } else {
      res.render("chatroom", { user: result });
    }
  });
});
module.exports = router;
