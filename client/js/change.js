
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
            let newpassword = $("#newpassword").val();
            let confirmpassword = $("#confirmpassword").val();
            if (newpassword.match(/[^a-zA-Z0-9*=-_#$%!]+/) || confirmpassword.match(/[^a-zA-Z0-9*=-_#$%!]+/)) {
                alert('密码不能包含除数字、小写字母、大写字母或 * = - _ # $ % ! 字符以外的其他字符!');
                return;
            }
            $.ajax({
                url: 'changepassword',
                type: 'POST',
                async: false,
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({
                    oldpassword: $("#oldpassword").val(),
                    newpassword: newpassword,
                    confirmpassword: confirmpassword,
                }),
                dataType: "json",
                success: function (data) {
                    if (data['failed']) {
                        alert(data['message']);
                    } else {
                        setInterval(window.location.replace('/'), 1000);
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