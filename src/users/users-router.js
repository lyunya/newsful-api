const express = require("express");
const UsersService = require("./users-service");
const usersRouter = express.Router();
const BodyParser = express.json();

usersRouter
  .route("/") //get all lists
  .get((req, res, next) => {
    const knex = req.app.get("db");
    ListsServices.getAllUsers(knex)
      .then((users) => {
        res.json(users);
      })
      .catch(next);
  });

usersRouter.post("/", BodyParser, (req, res, next) => {
  const { email, password } = req.body;

  for (const field of ["email", "password"])
    if (!req.body[field])
      return res.status(400).json({
        error: `Missing '${field}' in request body`,
      });

  const passwordError = UsersService.validatePassword(password);

  if (passwordError) return res.status(400).json({ error: passwordError });

  UsersService.hasUserWithEmail(req.app.get("db"), email)
    .then((hasUserWithEmail) => {
      if (hasUserWithEmail) {
        return res.status(400).json({ error: `Email already taken` });
      }

      return UsersService.hashPassword(password).then((hashedPassword) => {
        const newUser = {
          email,
          password: hashedPassword,
        };
        return UsersService.insertUser(req.app.get("db"), newUser).then(
          (user) => {
            res.status(201).json(UsersService.serializeUser(user));
          }
        );
      });
    })
    .catch(next);
});

module.exports = usersRouter;
