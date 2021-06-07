const ws2821x = require('@gbkwiatt/node-rpi-ws281x-native');
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', { flags: 'a' });
var log_stdout = process.stdout;

console.log = function (d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

const { getDayTime, parseTime, delay, colorToHex, getTimeAndDate } = require('./common')
const { steps } = require('./consts')
const channels = ws2821x.init({
    dma: 10,
    freq: 800000,
    channels: [
        { count: 363, gpio: 18, invert: false, brightness: 200, stripType: 'ws2812' },
        { count: 104, gpio: 13, invert: false, brightness: 200, stripType: 'ws2812' }
    ]
});
let timer;

class App {
    constructor() {
        this.sensorDown = new Gpio(17, 'in', 'rising');
        this.sensorUp = new Gpio(26, 'in', 'rising');
        this.directionLighted = ''
        this.isLighting = false
        this.lightUpLampAtStairs = false
        this.nightDimmer = 10
        this.dimmerLight = 120
        this.dimmerRange = 12
        this.dimmerDelay = 1
        this.timeToDimmerInSec = 60
        this.timeToDimmer = this.timeToDimmerInSec * 1000
        this.timerToDimmer
        this.effect = 'smooth'
        this.isSunset = false
        this.daySunsetAndSunriseUpdated;
        (async () => {
            await this.init();
            console.log(`App initialized at ${getTimeAndDate()}`)
            await delay(10000)
            await this.initTimers()
            this.initLightEndingStepsOnlyForSunset()
        })();
    }
    async init() {
        this.initSensor()
        await this.initTimers()
        this.initSunset()
        await this.initFlash()
        this.initLightEndingStepsOnlyForSunset()
    }
    initSensor() {
        const self = this
        this.sensorDown.watch(async function (err) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
            console.log(`Person detected on down floor at ${getTimeAndDate()}`)
            if (err) { //if an error
                console.error('There was an error', err); //output error message to console
                return;
            }
            await self.personEnterDown();
        });
        this.sensorUp.watch(async function (err) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
            console.log(`Person detected on up floor at ${getTimeAndDate()}`)
            if (err) { //if an error
                console.error('There was an error', err); //output error message to console
                return;
            }
            await self.personEnterUp();
        });
    }
    initSunset() {
        var milisToSunset = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), this.times.sunset.hour, this.times.sunset.minute, 0, 0) - new Date();
        if (milisToSunset < 0) {
            this.isSunset = true
        }
    }
    async initFlash() {
        this.lightAllDown()
        await delay(100)
        this.lightAllUp()
        await delay(100)
        this.lightAllDown()
        await delay(100)
        this.lightAllUp()
        await delay(100)
        this.lightAllDown()
        await delay(100)
        this.lightAllUp()
        await delay(100)
        this.lightAllDown()
    }
    async checkTimesAndRefresh() {
        if (this.daySunsetAndSunriseUpdated != new Date().getDay()) {
            await this.refreshTimeSunsetAndSunrise()
        }
    }
    async refreshTimeSunsetAndSunrise() {
        const rawDayTime = await getDayTime()
        this.times = {
            sunrise: parseTime(rawDayTime.sunrise),
            sunset: parseTime(rawDayTime.sunset)
        }
        console.log(`Downloaded new times: ${JSON.stringify(this.times)}`)
        this.daySunsetAndSunriseUpdated = new Date().getDay();
    }
    async initTimersForSunset() {
        var milisToSunset = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), this.times.sunset.hour, this.times.sunset.minute, 0, 0) - new Date();
        if (milisToSunset < 0) {
            milisToSunset += 86400000; // it's after 10am, try 10am tomorrow.
        }
        const self = this;
        setTimeout(async function () {
            console.log(`Now is sunset, start function at ${getTimeAndDate()}`, new Date)
            self.isSunset = true
            if (!self.isLighting) {
                self.initLightEndingSteps();
            }
            await self.checkTimesAndRefresh()
            self.initTimersForSunset()
        }, milisToSunset);

    }
    async initTimersForSunrise() {
        var milisToSunrise = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), this.times.sunrise.hour, this.times.sunrise.minute, 0, 0) - new Date();
        if (milisToSunrise < 0) {
            milisToSunrise += 86400000; // it's after 10am, try 10am tomorrow.
        }
        const self = this;
        setTimeout(async function () {
            console.log(`Now is sunrise, start function at ${getTimeAndDate()}`, new Date)
            self.isSunset = false
            if (!self.isLighting) {
                self.initLightEndingSteps();
            }
            await self.checkTimesAndRefresh()
            self.initTimersForSunrise()
        }, milisToSunrise);
    }
    async initTimers() {
        await this.refreshTimeSunsetAndSunrise();
        await this.initTimersForSunset();
        await this.initTimersForSunrise();
    }
    initLightEndingStepsOnlyForSunset() {
        if (this.isSunset) {
            this.lightEndingSteps()
        }
        return this.isSunset
    }
    initLightEndingSteps() {
        if (!this.initLightEndingStepsOnlyForSunset()) {
            this.lightAllDown()
        }
    }

    async personEnterDown() {
        if (this.isSunset) {
            if (this.directionLighted == 'down' && this.isLighting) {
                await this.lightEndDown()
            } else if (!this.isLighting) {
                await this.startLightingUp()
            }
        } else {
            console.log(`Person detected on stairs, but it is day so LEDs still off`)
        }
    }
    async personEnterUp() {
        if (this.isSunset) {
            if (this.directionLighted == 'up' && this.isLighting) {
                await this.lightEndUp()
            } else if (!this.isLighting) {
                await this.startLightingDown()
            }
        } else {
            console.log(`Person detected on stairs, but it is day so LEDs still off`)
        }
    }

    initEndUpTimer() {
        timer = setTimeout(async () => {
            if (this.isLighting) {
                this.isLighting = false
                await this.lightEndUp()
                this.initLightEndingStepsOnlyForSunset()
            }
        }, this.timeToDimmer);
    }
    async startLightingUp() {
        console.log(`Starting startLightingUp at ${getTimeAndDate()}`)
        if (this.isLighting) {
            clearTimeout(timer)
            this.initEndUpTimer()
            return
        }
        this.directionLighted = 'up'
        this.isLighting = true;
        await this.lightStartUp()
        this.initEndUpTimer()
    }
    async lightStartUp() {
        switch (this.effect) {
            case 'smooth':
                await this.lightStartUpEffectSmooth()
                break;
            case 'arrow':
                throw Error('Function not found')
                break;
            default:
                break;
        }
        await delay(2000)
    }
    async lightEndUp() {
        console.log(`Starting lightEndUp at ${getTimeAndDate()}`)
        switch (this.effect) {
            case 'smooth':
                await this.lightEndUpEffectSmooth()
                break;
            case 'arrow':
                throw Error('Function not found')
                break;
            default:
                break;
        }
        this.isLighting = false
    }
    async lightStartUpEffectSmooth() {
        let dimmerLight = this.dimmerLight
        let dimmerRange = this.dimmerRange
        let dimmerStep = Math.round(dimmerLight / dimmerRange);
        let dimmer = Math.round(dimmerStep);
        let step = 0;
        let willWork = true;
        while (willWork) {
            if (dimmer < dimmerLight - 1) {
                dimmer = Math.round(dimmer + dimmerStep);
            } else {
                dimmer = dimmerStep * 2;
                step++
            }
            await delay(this.dimmerDelay)
            if (step === steps.length - 1 && dimmer > dimmerLight - 1) {
                willWork == false
                return
            }
            this.lightStep(step, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
            ws2821x.render();
        }
    }
    async lightEndUpEffectSmooth() {
        let dimmerLight = this.dimmerLight
        let dimmerRange = this.dimmerRange
        let dimmerStep = Math.round(dimmerLight / dimmerRange);
        let dimmer = dimmerLight;
        let step = 0;
        let willWork = true;
        while (willWork) {
            if (dimmer < dimmerStep) {
                dimmer = dimmerLight;
                step++
            } else {
                dimmer = dimmer - dimmerStep
            }
            await delay(this.dimmerDelay)
            this.lightStep(step, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
            ws2821x.render();
            if (step == steps.length - 1 && dimmer < dimmerStep) {
                willWork == false
                return
            }
        }
    }
    async lightStartUpEffectRainbow() {
        console.log(`Starting lightStartUpEffectRainbow`)
        for (let index = 0; index < channels[1].array.length; index++) {
            channels[1].array[index] = common.colorWheel((RainbowOffset + i) % 256);
        }
        for (let index = 0; index < channels[0].array.length; index++) {
            channels[0].array[index] = common.colorWheel((RainbowOffset + i) % 256);;
        }
        RainbowOffset = (RainbowOffset + 1) % 256;
        ws2821x.render();
    }


    initEndDownTimer() {
        timer = setTimeout(async () => {
            if (this.isLighting) {
                this.isLighting = false
                await this.lightEndDown()
                this.initLightEndingStepsOnlyForSunset()
            }
        }, this.timeToDimmer);
    }
    async startLightingDown() {
        console.log(`Starting startLightingDown at ${getTimeAndDate()}`)
        if (this.isLighting) {
            clearTimeout(timer)
            this.initEndDownTimer()
            return
        }
        this.directionLighted = 'down'
        this.isLighting = true;
        await this.lightStartDown()
        this.initEndDownTimer()
    }
    async lightStartDown() {
        switch (this.effect) {
            case 'smooth':
                await this.lightStartDownEffectSmooth()
                break;
            case 'arrow':
                throw Error('Function not found')
                break;
            default:
                break;
        }
    }
    async lightEndDown() {
        console.log(`Starting lightEndDown at ${getTimeAndDate()}`)
        switch (this.effect) {
            case 'smooth':
                await this.lightEndDownEffectSmooth()
                break;
            case 'arrow':
                throw Error('Function not found')
                break;
            default:
                break;
        }
        this.isLighting = false
    }
    async lightStartDownEffectSmooth() {
        let dimmerLight = this.dimmerLight
        let dimmerRange = this.dimmerRange
        let dimmerStep = Math.round(dimmerLight / dimmerRange);
        let dimmer = dimmerLight;
        let step = steps.length;
        let willWork = true;
        while (willWork) {
            if (dimmer < dimmerLight - 1) {
                dimmer = dimmer + dimmerStep;
            } else {
                dimmer = dimmerStep * 2;
                step--;
            }
            await delay(this.dimmerDelay)
            if (step === 0 && dimmer > dimmerLight - 1) {
                willWork == false
                return
            }
            this.lightStep(step, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
            ws2821x.render();
        }
    }
    async lightEndDownEffectSmooth() {
        let dimmerLight = this.dimmerLight
        let dimmerRange = this.dimmerRange
        let dimmerStep = Math.round(dimmerLight / dimmerRange);
        let dimmer = dimmerLight;
        let step = steps.length - 1;
        let willWork = true;
        while (willWork) {
            if (dimmer < dimmerStep) {
                dimmer = dimmerLight;
                step--
            } else {
                dimmer = dimmer - dimmerStep
            }
            await delay(this.dimmerDelay)
            this.lightStep(step, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
            ws2821x.render();
            if (step === 0 && dimmer < dimmerStep) {
                willWork == false
                return
            }
        }
    }


    lightEndingSteps() {
        console.log(`Starting lightEndingSteps at ${getTimeAndDate()}`)
        var dimmer = this.nightDimmer
        var dimmer2 = parseInt(this.nightDimmer / 2)
        this.lightStep(0, `0x${colorToHex(dimmer2)}${colorToHex(dimmer2)}${colorToHex(dimmer2)}`)
        this.lightStep(1, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
        this.lightStep(steps.length - 1, `0x${colorToHex(dimmer)}${colorToHex(dimmer)}${colorToHex(dimmer)}`)
        ws2821x.render();
    }
    lightAllDown() {
        for (let index = 0; index < steps.length; index++) {
            this.lightStep(index, 0x000000)
        }
        // render
        ws2821x.render();
    }
    lightAllUp() {
        for (let index = 0; index < steps.length; index++) {
            this.lightStep(index, 0xffffff)
        }
        // render
        ws2821x.render();
    }
    lightStep(stepNumber, color = 0x3a3a3a) {
        const data = steps[stepNumber];
        for (let index = data.starts; index < data.starts + data.leds; index++) {
            channels[data.channel].array[index] = color;
        }
    }
}

let app = new App()

process.on('SIGINT', _ => {
    app.sensorDown.unexport();
    console.log(`App is destroyed by force as ${getTimeAndDate()}`)
    process.exit();
});
process.on('exit', () => {
    console.log(`App is destroyed as ${getTimeAndDate()}`)
    process.exit();
});
