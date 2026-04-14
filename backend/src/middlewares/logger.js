const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';

const METHOD_COLOR = {
  GET:    CYAN,
  POST:   GREEN,
  PUT:    YELLOW,
  PATCH:  YELLOW,
  DELETE: RED,
};

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const ms      = Date.now() - start;
    const status  = res.statusCode;
    const method  = req.method;

    const statusColor = status >= 500 ? RED
      : status >= 400 ? YELLOW
      : status >= 200 ? GREEN
      : CYAN;

    const methodColor = METHOD_COLOR[method] ?? RESET;

    const user = req.user
      ? `${DIM}[${req.user.email ?? req.user.sub} | ${req.user.role ?? 'no-role'}]${RESET}`
      : `${DIM}[anon]${RESET}`;

    const url    = req.originalUrl;
    const msStr  = ms > 500 ? `${RED}${ms}ms${RESET}` : `${DIM}${ms}ms${RESET}`;

    console.log(
      `${methodColor}${BOLD}${method.padEnd(6)}${RESET}` +
      ` ${url.padEnd(40)}` +
      ` ${statusColor}${status}${RESET}` +
      ` ${msStr}` +
      ` ${user}`
    );
  });

  next();
};

module.exports = requestLogger;
