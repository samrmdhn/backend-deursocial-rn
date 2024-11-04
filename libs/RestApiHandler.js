export const responseApi = async (res, result) => {
    return res.status(200).json(result);
};
