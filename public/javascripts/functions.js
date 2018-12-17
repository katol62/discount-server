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
        if (selected == '') {
            $("#foc").html('');
            $("#foc").append('<option value="">--Выбрать--</option>')
            $("#foc").selectpicker('refresh');
            $("#region").html('');
            $("#region").append('<option value="">--Выбрать--</option>')
            $("#region").selectpicker('refresh');
        } else {
            $.ajax({
                type: "GET",
                url: '/location/countries/'+selected+'/fos',
                //data: dataString,
                success: function (result) {
                    console.log(result)
                    $("#foc").html('');
                    $("#foc").append('<option value="">--Выбрать--</option>')
                    $.each(result, function () {
                        $("#foc").append('<option value="' + this.id + '">' + this.name + '</option>')
                    })
                    $("#foc").selectpicker('refresh');
                }
            });
        }

    });

    $('#foc').on('change', function () {
        var selected = $(this).find("option:selected").val();
        if (selected == '') {
            $("#region").html('');
            $("#region").append('<option value="">--Выбрать--</option>')
            $("#region").selectpicker('refresh');
        } else {
            $.ajax({
                type: "GET",
                url: '/location/fos/' + selected + '/regions',
                //data: dataString,
                success: function (result) {
                    console.log(result)
                    $("#region").html('');
                    $("#region").append('<option value="">--Выбрать--</option>')
                    $.each(result, function () {
                        $("#region").append('<option value="' + this.id + '">' + this.name + '</option>')
                    })
                    $("#region").selectpicker('refresh');
                }

            });
        }
    });

    $('#guest').change( ()=>{
        if($('#guest').prop('checked')) {
            $('#passContainer').css('display', 'block')
        } else {
            $('#passContainer').css('display', 'none')
        }
    });

    $('#admin').on('change', function () {
        var selected = $(this).find("option:selected").val();
        if (selected == '') {
            $.ajax({
                type: "GET",
                url: '/companies/super/1/companies',
                //data: dataString,
                success: function (result) {
                    $("#company").html('');
                    $("#company").append('<option value="">--Выбрать--</option>')
                    $.each(result, (index, item)=> {
                        console.log(this);
                        $("#company").append('<option value="' + item.id + '">' + item.name + '</option>')
                    })
                    $("#company").selectpicker('refresh');
                }

            });
        } else {
            $.ajax({
                type: "GET",
                url: '/companies/admins/' + selected + '/companies',
                //data: dataString,
                success: function (result) {
                    $("#company").html('');
                    $("#company").append('<option value="">--Выбрать--</option>')
                    $.each(result, (index, item)=> {
                        console.log(this);
                        $("#company").append('<option value="' + item.id + '">' + item.name + '</option>')
                    })
                    $("#company").selectpicker('refresh');
                }

            });
        }
    });

    $('#tariff').on('change', ()=> {

        var selected = $('#tariff').find("option:selected");
        if (selected.val() == '') {
            $('#passContainer').css('display', 'none');
            $('#pass').attr('disabled', true);
            $("#pass").selectpicker('refresh');
            $('#typeDisplay').val('');
            $('#type').val('');
            $('#tariffType').val('');
        } else {
            var card = selected.data('card');
            var price = selected.data('price');
            var type = selected.data('type');''
            var tariffType = selected.data('tarifftype');
            var typeDisplay = selected.data('type') == 'pass' ? 'Пасс' : 'Дисконт';
            $('#price').val(price);
            $('#type').val(type);
            $('#tariffType').val(tariffType);
            $('#typeDisplay').val(typeDisplay);
            /*
            if (card.toString()==='1') {
                $('#passContainer').css('display', 'block');
                $('#pass').attr('disabled', false);
                $("#pass").selectpicker('refresh');
            } else {
                $('#passContainer').css('display', 'none');
                $('#pass').attr('disabled', true);
                $("#pass").selectpicker('refresh');
            }
            */
        }

    });

});


var confirmDeleteUser = (cid, id, name)=> {
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

                var url = '/companies/'+cid+'/users/'+id+'/delete';
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

var confirmDeleteTransh = (id)=>{
    bootbox.confirm({
        message: "Удалить карты транша "+id+"?",
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

                var url = '/cards/transhes/'+id+'/delete';
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

var toCsv = ()=> {
    var start = $('#dstart').val();
    var end = $('#dend').val();
    // window.open('/cards/sellstocsv?dstart='+start+'&dend='+end, '_blank');
    location.href = '/cards/sellstocsv?dstart='+start+'&dend='+end;
};

var toPdf = ()=> {
    var start = $('#dstart').val();
    var end = $('#dend').val();
    window.open('/cards/sellstopdf?dstart='+start+'&dend='+end, '_blank');
};

var visitsToPdf = (company, terminal, type, detailType)=> {
    var start = $('#dstart').val();
    var end = $('#dend').val();
    let url = '/companies/pdf?company='+company+'&terminal='+terminal+'&type='+type+'&detailType='+detailType+'&dstart='+start+'&dend='+end;
    window.open(url, '_blank');
};

var journalToPdf = (type, detailType)=> {
    var start = $('#dstart').val();
    var end = $('#dend').val();
    let url = '/companies/journal_pdf?type='+type+'&detailType='+detailType+'&dstart='+start+'&dend='+end;
    window.open(url, '_blank');
};

var clearDateFields = ()=> {
    $('#dstart').val('');
    $('#dend').val('');
};
