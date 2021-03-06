module.exports = {
  PORT: process.env.PORT || 8000,
  API_KEY: process.env.REACT_APP_API_KEY,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://postgres@localhost/newsful",
  TEST_DATABSE_URL:
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:tapwater1@localhost/newsfultest",
  JWT_SECRET: process.env.JWT_SECRET || "change-this-secret",
};
