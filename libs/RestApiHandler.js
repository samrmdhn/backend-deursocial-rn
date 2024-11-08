export const responseApi = async (
    res,
    data,
    meta,
    message = "Data retrieved successfully",
    status = 0
) => {
    return res.status(200).json({
        data,
        meta,
        status: {
            code: status,
            message_client: message,
        },
    });
};
