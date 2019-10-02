var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];

var globals = {

    methods: {
        nameById: (id, arr)=> {
            var ar = Array(arr);
            var name = '';
            arr.forEach( function (item) {
                if (item.id == id) {
                    name = item.name;
                }
            });
            return name;
        },
        getCodeType: (cardNumber)=> {
            var codeString = cardNumber.substr(6, 4);
            console.log(codeString);
            var code = Number(codeString);
            return code;
        },
        getPassCount: (pass)=> {
            const passArray = config.pass;
            var count = 0;
            passArray.forEach( (item)=>{
                if (item.days.toString() == pass.toString()) {
                    count = item.count;
                }
            });
            return count;
        },
        getPassLimit: (pass) => {
            return pass === 1 ? pass * 4 : pass * 4;
        }

    },
};

module.exports = globals;

