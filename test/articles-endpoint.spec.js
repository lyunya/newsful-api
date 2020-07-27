const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeArticlesArray } = require("./test-helpers");
const { makeUsersArray } = require("./test-helpers");

describe("Articles Endpoint", function () {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw(
      "TRUNCATE newsful_saved_articles, newsful_users RESTART IDENTITY CASCADE"
    )
  );

  afterEach("cleanup", () =>
    db.raw(
      "TRUNCATE  newsful_saved_articles, newsful_users RESTART IDENTITY CASCADE"
    )
  );

  describe(`GET /api/saved-articles`, () => {
    context(`Given no articles`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/api/saved-articles")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    }); //end context no lists
    context(`Given articles in the db`, () => {
      const testUsers = makeUsersArray();
      const testSavedArticles = makeArticlesArray(testUsers);

      beforeEach(`insert users and articles`, () => {
        return db
          .into("newsful_users")
          .insert(testUsers)
          .then(() => {
            return db.into("newsful_saved_articles").insert(testSavedArticles);
          });
      }); //end beforeEach
      it(`responds with all lists`, () => {
        return supertest(app)
          .get("/api/saved-articles")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testSavedArticles);
      });
    });
  });
});
