const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function makeUsersArray() {
  return [
    {
      id: 1,
      email: "test-user-1@gmail.com",
      password: "password",
    },
    {
      id: 2,
      email: "test-user-2@gmail.com",
      password: "password",
    },
    {
      id: 3,
      email: "test-user-3@gmail.com",
      password: "password",
    },
  ];
}

function makeArticlesArray(users) {
  return [
    {
      id: 1,
      title:
        "RNC Chair McDaniel: With 100 days until election, enthusiasm gap points to reelection for President Trump",
      url:
        "https://www.foxnews.com/opinion/100-days-election-enthusiasm-gap-trump-ronna-mcdaniel",
      image:
        "https://a57.foxnews.com/cf-images.us-east-1.prod.boltdns.net/v1/static/694940094001/3abd8008-0466-4fc3-b116-5efdbe58bf88/349ac54b-8b68-4c7a-82ae-b11965dc2af3/1280x720/match/1024/512/image.jpg?ve=1&tl=1",
      user_id: users[0].id,
    },
    {
      id: 2,
      title:
        "Former Chinese property executive who criticised Xi over virus ousted from ruling party",
      url:
        "https://www.reuters.com/article/us-china-politics-critic/former-chinese-property-executive-who-criticised-xi-over-virus-ousted-from-ruling-party-idUSKCN24O2AE",
      image: "https://s4.reutersmedia.net/resources_v2/images/rcom-default.png",
      user_id: users[0].id,
    },
    {
      id: 3,
      title:
        "Kate Middleton 'barely acknowledged' Meghan Markle during royal family fallout: book",
      url:
        "https://www.foxnews.com/entertainment/kate-middleton-barely-acknowledged-meghan-markle-royal-family-fallout-book",
      image:
        "https://a57.foxnews.com/static.foxnews.com/foxnews.com/content/uploads/2020/07/1024/512/middleton-harry-meghan-getty.jpg?ve=1&tl=1",
      user_id: users[0].id,
    },
  ];
}

function makeSavedArticlesFixtures() {
  const testUsers = makeUsersArray();
  const testSavedArticles = makeArticlesArray(testUsers);


  return { testUsers, testSavedArticles };
}

function cleanTables(db) {
  return db.transaction((trx) =>
    trx
      .raw(
        `TRUNCATE
        newsful_saved_articles,
        newsful_users`
      )
      .then(() =>
        Promise.all([
          trx.raw(
            `ALTER SEQUENCE newsful_saved_articles_id_seq minvalue 0 START WITH 1`
          ),
          trx.raw(
            `ALTER SEQUENCE newsful_users_id_seq minvalue 0 START WITH 1`
          ),
          trx.raw(`SELECT setval('newsful_saved_articles_id_seq', 0)`),
          trx.raw(`SELECT setval('newsful_users_id_seq', 0)`)
        ])
      )
  );
}

function seedUsers(db, users) {
  const preppedUsers = users.map((user) => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1),
  }));
  return db
    .into("newsful_users")
    .insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(`SELECT setval('newsful_users_id_seq', ?)`, [
        users[users.length - 1].id,
      ])
    );
}

function seedSavedArticlesTables(db, articles, users) {
  // use a transaction to group the queries and auto rollback on any failure
  return db.transaction(async (trx) => {
    await trx.into("newsful_users").insert(users);
    await trx.into("newsful_saved_articles").insert(articles);
    // update the auto sequence to match the forced id values
    await Promise.all([
      trx.raw(`SELECT setval('newsful_users_id_seq', ?)`, [
        users[users.length - 1].id,
      ]),
      trx.raw(`SELECT setval('newsful_saved_articles_id_seq', ?)`, [
        lists[lists.length - 1].id,
      ]),
    ]);
  });
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.email,
    algorithm: "HS256",
  });
  return `Bearer ${token}`;
}

module.exports = {
  makeUsersArray,
  makeArticlesArray,
  makeSavedArticlesFixtures,
  cleanTables,
  seedSavedArticlesTables,
  seedUsers,
  makeAuthHeader,
};
