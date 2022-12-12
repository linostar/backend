const db = require('./database');

const GROUP_SIZE = 100;

const init = async () => {
  await db.run('CREATE TABLE GroupConnections (firstGroupId INTEGER PRIMARY KEY, secondGroupId INTEGER, UNIQUE(firstGroupId, secondGroupId));');
  await db.run('CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(32), groupId INTEGER);');
  await db.run('CREATE TABLE Friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, friendId INTEGER);');
  const users = [];
  const names = ['foo', 'bar', 'baz'];
  for (i = 0; i < 2700; ++i) {
    let n = i;
    let name = '';
    for (j = 0; j < 3; ++j) {
      name += names[n % 3];
      n = Math.floor(n / 3);
      name += n % 10;
      n = Math.floor(n / 10);
    }
    users.push(name);
  }
  const friends = users.map(() => []);
  for (i = 0; i < friends.length; ++i) {
    const n = 10 + Math.floor(90 * Math.random());
    const list = [...Array(n)].map(() => Math.floor(friends.length * Math.random()));
    list.forEach((j) => {
      if (i === j) {
        return;
      }
      if (friends[i].indexOf(j) >= 0 || friends[j].indexOf(i) >= 0) {
        return;
      }
      friends[i].push(j);
      friends[j].push(i);
    });
  }
  console.log("Init Users Table...");
  await Promise.all(users.map((un, index) => db.run(`INSERT INTO Users (name, groupId) VALUES ('${un}', ${(index % GROUP_SIZE) + 1});`)));
  console.log("Init Friends Table...");
  await Promise.all(friends.map((list, i) => {
    Promise.all(list.map((j) => {
        let group1 = (i + 1) % GROUP_SIZE + 1;
        let group2 = (j + 1) % GROUP_SIZE + 1;
        db.run(`INSERT INTO Friends (userId, friendId) VALUES (${i + 1}, ${j + 1});`);
        db.run(`INSERT OR IGNORE INTO GroupConnections (firstGroupId, secondGroupId) VALUES (${group1}, ${group2});`);
        db.run(`INSERT OR IGNORE INTO GroupConnections (firstGroupId, secondGroupId) VALUES (${group2}, ${group1});`);
      }
    ));
  }));
  console.log("Ready.");
}
module.exports.init = init;

const getConnection = async (friendId1, friendId2) => {
  let results = [];
  let connection = 0;
  let group1 = friendId1 % GROUP_SIZE + 1;
  let group2 = friendId2 % GROUP_SIZE + 1;

  try {
    results = await db.all(`SELECT * FROM GroupConnections WHERE firstGroupId = ${group1} AND secondGroupId = ${group2};`);
    if (results.length) {
      connection = 2;
    }
    else {
      // find groups that have connections to both group1 and group2
      results = await db.all(`SELECT gc1.firstGroupId FROM GroupConnections AS gc1 INNER JOIN GroupConnections AS gc2 WHERE gc1.firstGroupId = gc2.firstGroupId AND gc1.secondGroupId != gc2.secondGroupId;`);
      if (!results.length) {
        // no 3rd or 4th connection
        connection = 0;
      }
      else {
        connection = 4; // connection will be 3 or 4 in that case
        console.log("CONNECTION: 4")
        for (let commGroup of results) {
          for (let fid = (commGroup - 1) * GROUP_SIZE; fid < commGroup * GROUP_SIZE; fid++) {
            let friends = await db.all(`SELECT * FROM Friends WHERE (userId = ${fid} AND friendId = ${friendId1}) OR (userId = ${fid} AND friendId = ${friendId2});`);
            if (friends.length === 2) {
              console.log("CONNECTION: 3")
              return 3; // connection = 3
            }
          }
        }
      }
    }
  }
  catch (ex) {
    console.error(ex);
    connection = -1; // database error occured
  }

  return connection;
}

const search = async (req, res) => {
  const query = req.params.query;
  const userId = parseInt(req.params.userId);

  db.all(`SELECT id, name, id in (SELECT friendId from Friends where userId = ${userId}) as connection from Users where name LIKE '${query}%' LIMIT 20;`).then(async (results) => {
    for (let i = 0; i < results.length; i++) {
      if (results[i].connection === 0) {
        results[i] = {
          id: results[i].id,
          name: results[i].name,
          connection: await getConnection(userId, results[i].id)
        };
      }
    }
    res.statusCode = 200;
    res.json({
      success: true,
      users: results
    });
  }).catch((err) => {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  });
}
module.exports.search = search;