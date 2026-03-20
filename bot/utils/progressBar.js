const chalk = require('chalk');

const progressBar = {
  create: (current, total, length = 20) => {
    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledLength = Math.floor(progress * length);
    const emptyLength = length - filledLength;

    const filled = chalk.green('█').repeat(filledLength);
    const empty = chalk.gray('░').repeat(emptyLength);

    return `${filled}${empty} ${Math.round(progress * 100)}%`;
  }
};

module.exports = progressBar;
