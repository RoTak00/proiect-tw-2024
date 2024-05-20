$(document).ready(function () {
  $("#form_inreg").on("submit", function (event) {
    // Clear previous error messages
    $(".form-error").remove();

    // Track whether the form is valid
    let isValid = true;

    // Validate required fields
    $("input[required], select[required]").each(function () {
      if ($(this).val() === "") {
        isValid = false;
        $(this)
          .parent(".input-group")
          .after(
            '<div class="form-error text-danger">Campul este obligatoriu!</div>'
          );
      }
    });

    // Validate email format
    const email = $("#inp-email").val();
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
      isValid = false;
      $("#inp-email")
        .parent(".input-group")
        .after(
          '<div class="form-error text-danger">Email-ul nu este formatat corect!</div>'
        );
    }

    // Validate password match
    const password = $("#parl").val();
    const confirmPassword = $("#rparl").val();
    if (password !== confirmPassword) {
      isValid = false;
      $("#rparl")
        .parent(".input-group")
        .after(
          '<div class="form-error text-danger">Parolele nu se potrivesc!</div>'
        );
    }

    // Validate telephone format
    const telephone = $("#inp-telephone").val();
    const phonePattern = /^\+?0[0-9]{9,}$/;
    if (!phonePattern.test(telephone)) {
      isValid = false;
      $("#inp-telephone")
        .parent(".input-group")
        .after(
          '<div class="form-error text-danger">Format invalid! ( 0711111111 )</div>'
        );
    }

    // If the form is not valid, prevent submission
    if (!isValid) {
      event.preventDefault();
    }
  });
});
