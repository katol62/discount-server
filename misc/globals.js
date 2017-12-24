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
        }

    },
};

module.exports = globals;

