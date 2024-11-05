export const makeEpocTime = () => {
    const date = new Date();
    const options = { timeZone: "Asia/Jakarta" };
    const jakartaDate = new Intl.DateTimeFormat("en-US", options).format(date);
    const epochTimeJakarta = new Date(jakartaDate).getTime() / 1000;
    return epochTimeJakarta;
};

export const epochToDateJakarta = (epochTime) => {
    const milliseconds = epochTime * 1000;
    const date = new Date(milliseconds);
    const options = {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
    };
    const jakartaDate = new Intl.DateTimeFormat("en-US", options).format(date);
    return jakartaDate;
};
