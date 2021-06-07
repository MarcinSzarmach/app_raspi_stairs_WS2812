const axios = require('axios');
const XmasRed = 0xff0000;
const XmasGreen = 0x00ff00;
const XmasBlue = 0x0000ff;
const XmasWhite = 0xffffff;
const defaultSunrise = { sunrise: "4:00:00 AM", sunset: "7:00:00 PM" }
module.exports = {
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
    getDayTime: async () => {
        try {
            const api = await axios.get("https://api.sunrise-sunset.org/json?lat=53.0943221&lng=23.2072674")
            return { sunrise: api.data.results.sunrise, sunset: api.data.results.sunset }
        } catch (error) {
            console.error(`Can't get sunrise and sunset from api, setting default ${JSON.stringify(defaultSunrise)}`)
            return defaultSunrise
        }
    },
    parseTime: (time) => {
        const datas = time.split(':');
        const isPM = time.includes("PM");
        return { hour: isPM ? parseInt(datas[0]) + 12 + 1 : parseInt(datas[0]) + 1, minute: parseInt(datas[1]) + 1 }
    },
    getTimeAndDate: () => {
        return `${new Date().getDate()}/${new Date().getMonth()} - ${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`
    },
    colorToHex: (rgb) => {
        var hex = Number(rgb).toString(16);
        if (hex.length < 2) {
            hex = "0" + hex;
        }
        return hex;
    },
    getRandomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    rgb2Int: (r, g, b) => {
        return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
    },
    colorWheel: (pos) => {
        pos = 255 - pos;
        if (pos < 85) {
            return this.rgb2Int(255 - pos * 3, 0, pos * 3);
        } else if (pos < 170) {
            pos -= 85;
            return this.rgb2Int(0, pos * 3, 255 - pos * 3);
        } else {
            pos -= 170;
            return this.rgb2Int(pos * 3, 255 - pos * 3, 0);
        }
    },
    RandomXmasColor: () => {
        var xmasLight = this.getRandomInt(1, 4);
        var xmasColor = XmasRed;
        switch (xmasLight) {
            case 1:
                xmasColor = XmasRed;
                break;
            case 2:
                xmasColor = XmasGreen;
                break;
            case 3:
                xmasColor = XmasBlue;
                break;
            case 4:
                xmasColor = XmasWhite;
                break;
        }
        return xmasColor;
    },
};
