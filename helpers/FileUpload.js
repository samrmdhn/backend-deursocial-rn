import fs  from "fs"
// Fungsi untuk mengunggah file
export const uploadFile = async (file, destination) => {
    return new Promise((resolve, reject) => {
        // console.log("uploadFile", file)
        file.mv(destination, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Fungsi untuk memperbarui file
export const updateFile = (file, destination) => {
    return uploadFile(file, destination);
}

// Fungsi untuk menghapus file
export const deleteFile = (filename) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filename, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export const fileExists = (filepath) => {
    return fs.existsSync(filepath);
}