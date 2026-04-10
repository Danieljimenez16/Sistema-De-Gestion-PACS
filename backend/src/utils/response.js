const ok = (data = {}) => {
  // If it's a paginated response (from buildPaginatedResponse), flatten it
  if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
    return {
      success: true,
      data: data.items,
      meta: {
        total: data.pagination.total,
        page: data.pagination.page,
        limit: data.pagination.limit,
        total_pages: data.pagination.totalPages,
      },
    };
  }

  return {
    success: true,
    data,
  };
};

const fail = (message = 'Error', errors = {}) => ({
  success: false,
  message,
  errors,
});

module.exports = {
  ok,
  fail,
};
