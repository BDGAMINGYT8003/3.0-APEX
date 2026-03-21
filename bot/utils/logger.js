const logger = {
  info: (message) => {
    console.log(`\x1b[34m[INFO] ${message}\x1b[0m`);
  },
  success: (message) => {
    console.log(`\x1b[32m[SUCCESS] ${message}\x1b[0m`);
  },
  warn: (message) => {
    console.log(`\x1b[33m[WARN] ${message}\x1b[0m`);
  },
  error: (message) => {
    console.log(`\x1b[31m[ERROR] ${message}\x1b[0m`);
  },
  debug: (message) => {
    console.log(`\x1b[90m[DEBUG] ${message}\x1b[0m`);
  }
};

module.exports = logger;
