export const homepage = async (req, res) => {
    return res.status(200).json({
        data: [],
        message: "Internal server error",
        status: 1
    });
}