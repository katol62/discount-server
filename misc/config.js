var locale = require('./locale');
var dict = locale.ru;

module.exports = {

    'server': {
        host: 'localhost',
        port: 3000
    },
    'locale': 'ru',
    'secret': 'Mxmbawlx50XOpKkUMcY2wNjoRmU06g3ComNXJfxfnyt9ESuAKSQxe8FXG',
    'sessionSecret': '2dgiEtWdUxbqK9hZ9sWZ4KdGwI5pRmQo0xivuMlh5G2f0ZBco2eDPEZ269Mg',
    'roles': ['super', 'admin', 'cashier'],
    'tariffTypes': [
        {
            id:'adult', name:dict.labels.label_tariff_adult
        },
        {
            id:'child',name:dict.labels.label_tariff_child
        },
        {
            id:'other', name:dict.labels.label_tariff_other
        }
    ],
    'cardStatus': [
        {
            code:'published', name: 'Published'
        },
        {
            code:'sold', name: 'Sold'
        },
        {
            code:'activated', name: 'Activated'
        },
        {
            code:'overdue', name: 'Overdue'
        },
        {
            code:'blocked', name: 'Blocked'
        }
    ],
    'passType': [{id: '1', name: dict.labels.label_one_day},{id: '3', name: dict.labels.label_three_days},{id: '6', name: dict.labels.label_six_days}]
};