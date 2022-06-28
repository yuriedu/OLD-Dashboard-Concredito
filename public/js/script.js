  function login(user, password, auto) {

  }(function () {
    $.ajax({ method: "post",url: `/login`, data: { user: localStorage.getItem('user'), password: localStorage.getItem('password') },
      success: function(s) {

      },
      error: function(e) {
        return location.href = `/login`
      }
    });
  })();