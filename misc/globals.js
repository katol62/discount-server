var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];

exports = {

    methods: {
        nameById: function(id, arr) {
            var ar = Array(arr);
            var name = '';
            arr.forEach( function (item) {
                if (item.code == id) {
                    name = item.name;
                }
            });
            return name;
        }
    },
    vars: {
        discountTypes: ()=> {
            return [
                {code: 'pass', name: dict.labels.label_pass},
                {code: 'discount', name: dict.labels.label_discount},
            ];
        }
    }

};


