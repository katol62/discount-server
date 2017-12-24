$(document).ready(()=>{

    $('#additional').css('display', 'none');
    $('#publish').css('display', 'block');

    $('#role').on('change', function () {
        var selected = $(this).find("option:selected").val();
        if (selected == 'cashier') {
            $('#additional').css('display', 'block');
            $('#publish').css('display', 'none');
        } else {
            $('#additional').css('display', 'none');
            $('#publish').css('display', 'block');
        }
    });

    //create company
    $('#country').on('change', function () {
        var selected = $(this).find("option:selected").val();
        $.ajax({
            type: "GET",
            url: '/location/countries/'+selected+'/fos',
            //data: dataString,
            success: function (result) {
                console.log(result)
                $("#foc").html('');
                $("#foc").append('<option value="">--Select--</option>')
                $.each(result, function () {
                    $("#foc").append('<option value="' + this.id + '">' + this.name + '</option>')
                })
                $("#foc").selectpicker('refresh');
            }

        });

    });

    $('#foc').on('change', function () {
        var selected = $(this).find("option:selected").val();
        var selected = $(this).find("option:selected").val();
        $.ajax({
            type: "GET",
            url: '/location/fos/' + selected + '/regions',
            //data: dataString,
            success: function (result) {
                console.log(result)
                $("#region").html('');
                $("#region").append('<option value="">--Select--</option>')
                $.each(result, function () {
                    $("#region").append('<option value="' + this.id + '">' + this.name + '</option>')
                })
                $("#region").selectpicker('refresh');
            }

        });
    });

    $('#guest').change( ()=>{
        if($('#guest').prop('checked')) {
            $('#passContainer').css('display', 'block')
        } else {
            $('#passContainer').css('display', 'none')
        }
    })

});


var confirmDeleteUser = (id, name)=> {
    bootbox.confirm({
        message: "Удалить пользователя "+name+"?",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/users/delete/'+id;
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: ()=> {

                    },
                });
            }
        }
    });
};

var confirmDeleteCompany = (id, name)=> {
    bootbox.confirm({
        message: "Удалить компанию?<br>Все связанные с ней терминалы будут удалены!",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/companies/'+id+'/delete';
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: ()=> {

                    },
                });
            }
        }
    });
};


var confirmDeleteAdmin = (id, name)=>{
    bootbox.confirm({
        message: "Удалить администратора?<br>Внимание! Вы удалите все связанные с ним компании!",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/admins/'+id+'/delete';
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: (data)=> {
                        console.log(data);
                    },
                });
            }
        }
    });
};



var confirmDeleteTerminal = (cid, tid, name)=> {

    bootbox.confirm({
        message: "Удалить терминал "+name+"?",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/companies/'+cid+'/terminals/'+tid+'/delete';
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: (data)=> {
                        console.log(data);
                    },
                });
            }
        }
    });
};

var confirmDeleteTariff = (cid, tid, tariff, name)=> {

    bootbox.confirm({
        message: "Удалить тариф "+name+"?",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/companies/'+cid+'/terminals/'+tid+'/tariffs/'+tariff+'/delete';
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: (data)=> {
                        console.log(data);
                    },
                });
            }
        }
    });
};

var confirmDeleteCard = (id, number)=>{
    bootbox.confirm({
        message: "Удалить карту "+number+"?",
        buttons: {
            confirm: {
                label: 'Да',
                className: 'btn-success'
            },
            cancel: {
                label: 'Нет',
                className: 'btn-danger'
            }
        },
        callback: function (result) {
            if (result) {

                var url = '/cards/'+id+'/delete';
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'DELETE');
                    },
                    data: {},
                    success:  () => {
                        location.reload();
                    },
                    error: (data)=> {
                        console.log(data);
                    },
                });
            }
        }
    });
};
