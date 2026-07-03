import config from './config.js';
import { createDb } from './db.js';
import { makeApp } from './app.js';

const db = createDb();
const app = makeApp(db);

app.listen(config.PORT, () => {
  console.log(`Newsful API listening on port ${config.PORT}`);
});
