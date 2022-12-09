const db = require('./database');

const friend = async (req, res) => {
	await Promise.all([
		db.run(`INSERT INTO Friends (userId, friendId) VALUES (${req.params.userId}, ${req.params.friendId}), (${req.params.friendId}, ${req.params.userId});`)
	]);
	res.send(`{"success": true}`);
};

const unfriend = async (req, res) => {
	await db.run(`DELETE FROM Friends WHERE (userId = ${req.params.userId} AND friendId = ${req.params.friendId}) OR (userId = ${req.params.friendId} AND friendId = ${req.params.userId});`);
	res.send(`{"success": true}`);
};

module.exports.friend = friend;
module.exports.unfriend = unfriend;
