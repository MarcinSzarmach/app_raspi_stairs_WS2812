Vue.config.devtools = true;
var app = new Vue({
    el: '#app',
    data: {
        state: null,
    },
    watch: {
        "state.effect": function (effect, old) {
            const self = this;
            if (old == undefined) return
            axios.post('/state', { effect })
                .then(function (response) {
                    self.state = response.data
                })
        }
    },
    methods: {
        lightEndingSteps() {
            axios.post('/lightEndingSteps')
        },
        changeState(type) {
            const self = this;
            axios.post('/state', { [type]: !this.state[type] })
                .then(function (response) {
                    self.state = response.data
                })
        },
        changeStateIsLighting(isLighting) {
            axios.post('/state', { isLighting })
                .then(function (response) {
                    self.state = response.data
                })
        },
        light(param) {
            axios.get(param)
                .then(function (response) {
                    self.state = response.data
                })
        }
    },
    created: function () {
        const self = this;
        axios.get('/state')
            .then(function (response) {
                self.state = response.data
            })
    }
})