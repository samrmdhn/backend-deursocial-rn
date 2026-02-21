/**
 * 
 * @param {*} page 
 * @param {*} limit 
 * @param {*} totalCount 
 * @returns 
 */
export const getPagination = (page, limit, totalCount) => {
    const currentPage = parseInt(page) || 1;
    const limitPerPage = parseInt(limit) || 10;
    const offset = (currentPage - 1) * limitPerPage;
    const totalPages = Math.ceil(totalCount / limitPerPage);

    return { offset, limitPerPage, totalPages, currentPage };
};
