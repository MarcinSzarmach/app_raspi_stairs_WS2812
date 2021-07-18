const express = require('express')
const node = express()
const path = require('path');
const port = 3000
var fs = require('fs');
module.exports = {
    node: (app) => {
        node.use(express.json());
        node.use(express.urlencoded({ extended: true }));
        node.get('/state', (req, res) => {
            res.send({
                isLighting: app.isLighting,
                isSensorEnabled: app.isSensorEnabled,
                forceLightInDaylight: app.isSensorEnabled,
                lightUpLampAtStairs: app.lightUpLampAtStairs,
                nightDimmer: app.nightDimmer,
                times: app.times,
                dimmerLight: app.dimmerLight,
                dimmerRange: app.dimmerRange,
                dimmerDelay: app.dimmerDelay,
                timeToDimmerInSec: app.timeToDimmerInSec,
                timeToDimmer: app.timeToDimmer,
                timerToDimmer: app.timerToDimmer,
                effect: app.effect,
                effects: app.effects,
            })
        })
        node.get('/files', (req, res) => {
            const files = fs.readFileSync(path.join(__dirname))
            res.send(files)
        })
        node.post('/state', (req, res) => {
            for (const key in req.body) {
                if (req.body.hasOwnProperty(key)) {
                    app[key] = req.body[key]
                }
            }
            res.send({
                isLighting: app.isLighting,
                isSensorEnabled: app.isSensorEnabled,
                forceLightInDaylight: app.forceLightInDaylight,
                lightUpLampAtStairs: app.lightUpLampAtStairs,
                nightDimmer: app.nightDimmer,
                times: app.times,
                dimmerLight: app.dimmerLight,
                dimmerRange: app.dimmerRange,
                dimmerDelay: app.dimmerDelay,
                timeToDimmerInSec: app.timeToDimmerInSec,
                timeToDimmer: app.timeToDimmer,
                timerToDimmer: app.timerToDimmer,
                effect: app.effect,
                effects: app.effects,
            })
        })
        node.post('/lightEndingSteps', (req, res) => {
            app.lightEndingSteps()
            res.send(true)
        })
        node.get('/lightToUp', (req, res) => {
            app.startLightingUp()
            res.send(true)
        })
        node.get('/lightToDown', (req, res) => {
            app.startLightingDown()
            res.send(true)
        })
        node.get('/lightUp', (req, res) => {
            app.lightAllUp()
            res.send(true)
        })
        node.get('/lightDown', (req, res) => {
            app.lightAllDown()
            res.send(true)
        })
        node.get('/', (req, res) => {
            const index = fs.readFileSync(path.join(__dirname, '/index.html')).toString()
            const vue = fs.readFileSync(path.join(__dirname, '/vue/app.js')).toString()
            res.end(index.replace("PLACEHOLDER", vue))
        })

        node.listen(port, () => {
            console.log(`Stairs app listening at http://localhost:${port}`)
        })
        return node
    }
}
