/**
 * Parse pagination params from query string.
 * Returns { page, limit, from, to } for Supabase range().
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
};

const buildPaginatedResponse = (data, count, page, limit) => ({
  items: data,
  pagination: {
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  },
});

module.exports = { parsePagination, buildPaginatedResponse };
