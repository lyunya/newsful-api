const knex = require("knex");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const helpers = require("./test-helpers");

describe("Auth Endpoints", function () {
  let db;

  const { testUsers } = helpers.makeSavedArticlesFixtures();
  const testUser = testUsers[0];

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("cleanup", () => helpers.cleanTables(db));

  afterEach("cleanup", () => helpers.cleanTables(db));

  describe(`POST /api/users`, () => {
    context(`User Validation`, () => {
      beforeEach("insert users", () => helpers.seedUsers(db, testUsers));
      const requiredFields = ["email", "password"];

      requiredFields.forEach((field) => {
        const registerAttemptBody = {
          email: testUser.email,
          password: testUser.password,
        };

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field];

          return supertest(app)
            .post("/api/users")
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`,
            });
        });
      });
      it(`responds 400 'Password be longer than 8 characters' when empty password`, () => {
        const userShortPassword = {
          email: "test@test.com",
          password: "1234567",
        };
        return supertest(app)
          .post("/api/users")
          .send(userShortPassword)
          .expect(400, { error: `Password must be longer than 8 characters` });
      });
      it(`responds 400 error when password starts with spaces`, () => {
        const userPasswordStartsSpaces = {
          email: "test@test.com",
          password: " 1234567",
        };
        return supertest(app)
          .post("/api/users")
          .send(userPasswordStartsSpaces)
          .expect(400, {
            error: `Password must not start or end with empty spaces`,
          });
      });
      context(`Happy path`, () => {
        it(`responds 201, user, storing bcryped password`, () => {
          const newUser = {
            email: "test@test.com",
            password: "T@pwater1",
          };
          return supertest(app)
            .post("/api/users")
            .send(newUser)
            .expect(201)
            .expect((res) => {
              expect(res.body).to.have.property("id");
              expect(res.body.email).to.eql(newUser.email);
              expect(res.body).to.not.have.property("password");
            })
            .expect((res) =>
              db
                .from("newsful_users")
                .select("*")
                .where({ id: res.body.id })
                .first()
                .then((row) => {
                  expect(row.email).to.eql(newUser.email);
                  return bcrypt.compare(newUser.password, row.password);
                })
                .then((compareMatch) => {
                  expect(compareMatch).to.be.true;
                })
            );
        });
      });
    });
  });
});
