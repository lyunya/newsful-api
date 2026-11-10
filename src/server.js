import config, { missingProductionConfig } from './config.js';
import { createDb } from './db.js';
import { makeApp } from './app.js';

const problems = missingProductionConfig();
if (problems.length > 0) {
  console.error(`Refusing to start:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const db = createDb();
const app = makeApp(db);

app.listen(config.PORT, () => {
  console.log(`Newsful API listening on port ${config.PORT}`);
});
