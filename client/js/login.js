
(function ($) {
    "use strict";
    var input = $('.validate-input .input100');

    $('#loginbutton').on('click', function () {
        var check = true;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                showValidate(input[i]);
                check = false;
            }
        }

        if (check) {
            $.ajax({
                url: 'login',
                type: 'POST',
                async: false,
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({
                    username: $("#username").val(),
                    password: $("#password").val()
                }),
                dataType: "json",
                success: function (data) {
                    if (data['failed']) {
                        alert(data['message']);
                    }
                },
            });
        }
        return check;
    });


    $('.validate-form .input100').each(function () {
        $(this).focus(function () {
            hideValidate(this);
        });
    });

    function validate(input) {
        if ($(input).val().trim() == '') {
            return false;
        }
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();
        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();
        $(thisAlert).removeClass('alert-validate');
    }

})(jQuery);