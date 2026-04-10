const ok = (data = {}) => ({
  success: true,
  data,
});

const fail = (message = 'Error', errors = {}) => ({
  success: false,
  message,
  errors,
});

module.exports = {
  ok,
  fail,
};
