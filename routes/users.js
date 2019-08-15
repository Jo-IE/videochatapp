var express = require('express');
var router = express.Router();

/* GET user-specific chatroom. */
router.get('/:username', function(req, res, next) {
  res.render('chatroom');
});

module.exports = router;
