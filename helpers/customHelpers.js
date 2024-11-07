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

export const dateToEpochTime = (time) => {
    const date = new Date(time); // time is a Format ISO 8601 atau format yang didukung JavaScript
    const epochTimeInMilliseconds = date.getTime();

    return Math.floor(epochTimeInMilliseconds / 1000);
};

export const convertToSlug = (text) => {
    text = text.replace(/[^\w\s-]+/g, " ");
    text = text.replace(/\s+/g, " ");
    text = text.trim().replace(/ /g, "-");
    return text.toLowerCase();
};
