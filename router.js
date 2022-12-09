const express = require('express');

const user = require('./user');
const friends = require('./friends');

const router = express.Router();

router.get('/search/:userId/:query', user.search);
router.get('/friend/:userId/:friendId', friends.friend);
router.get('/unfriend/:userId/:friendId', friends.unfriend);

module.exports = router;