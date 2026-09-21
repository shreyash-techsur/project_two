document.addEventListener('DOMContentLoaded', function () {
  // If already logged in, redirect to main app
  var token = localStorage.getItem('auth_token');
  if (token) {
    // Verify the token is still valid
    fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (res) {
        if (res.ok) {
          window.location.href = '/';
        }
        // If not ok, token is invalid — stay on login page
      })
      .catch(function () {
        // Network error — stay on login page
      });
  }

  // Cache DOM references
  var form = document.getElementById('auth-form');
  var usernameInput = document.getElementById('username');
  var passwordInput = document.getElementById('password');
  var submitBtn = document.getElementById('auth-submit-btn');
  var authTitle = document.getElementById('auth-title');
  var authSwitch = document.getElementById('auth-switch');
  var toggleAuth = document.getElementById('toggle-auth');
  var authError = document.getElementById('auth-error');
  var toastContainer = document.getElementById('toast-container');

  // State: 'login' or 'register'
  var mode = 'login';

  // Focus username on load
  usernameInput.focus();

  // Toggle between login and register
  toggleAuth.addEventListener('click', function (e) {
    e.preventDefault();
    clearErrors();
    authError.style.display = 'none';

    if (mode === 'login') {
      mode = 'register';
      authTitle.textContent = 'Register';
      submitBtn.textContent = 'Create Account';
      authSwitch.innerHTML = 'Already have an account? <a href="#" id="toggle-auth">Login</a>';
      passwordInput.setAttribute('autocomplete', 'new-password');
    } else {
      mode = 'login';
      authTitle.textContent = 'Login';
      submitBtn.textContent = 'Login';
      authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-auth">Register</a>';
      passwordInput.setAttribute('autocomplete', 'current-password');
    }

    // Re-bind toggle click
    document.getElementById('toggle-auth').addEventListener('click', arguments.callee.bind(this));
    usernameInput.focus();
  });

  // Form submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    authError.style.display = 'none';

    var username = usernameInput.value.trim();
    var password = passwordInput.value;

    // Client-side validation
    var errors = [];
    if (!username) {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (mode === 'register' && username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    }
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (mode === 'register' && password.length < 4) {
      errors.push({ field: 'password', message: 'Password must be at least 4 characters' });
    }

    if (errors.length > 0) {
      displayErrors(errors);
      return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'login' ? 'Logging in...' : 'Creating account...';

    var endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 200 || result.status === 201) {
          // Success — save token and redirect
          localStorage.setItem('auth_token', result.data.token);
          localStorage.setItem('auth_user', JSON.stringify(result.data.user));
          window.location.href = '/';
        } else if (result.data.errors) {
          // Server validation errors
          var serverErrors = result.data.errors;
          var hasFieldError = false;

          serverErrors.forEach(function (err) {
            if (err.code && err.code.includes('USERNAME')) {
              displayErrors([{ field: 'username', message: err.message }]);
              hasFieldError = true;
            } else if (err.code && err.code.includes('PASSWORD')) {
              displayErrors([{ field: 'password', message: err.message }]);
              hasFieldError = true;
            }
          });

          if (!hasFieldError) {
            // General error (e.g., invalid credentials)
            authError.textContent = serverErrors[0].message;
            authError.style.display = 'block';
          }
        } else {
          authError.textContent = 'Something went wrong. Please try again.';
          authError.style.display = 'block';
        }
      })
      .catch(function () {
        authError.textContent = 'Unable to connect to the server. Check your connection and try again.';
        authError.style.display = 'block';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'login' ? 'Login' : 'Create Account';
      });
  });

  // --- Error Display ---
  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(function (el) { el.textContent = ''; });
    document.querySelectorAll('.input-error').forEach(function (el) { el.classList.remove('input-error'); });
  }

  function displayErrors(errors) {
    errors.forEach(function (err) {
      var errorEl = document.getElementById(err.field + '-error');
      var inputEl = document.getElementById(err.field);
      if (errorEl) errorEl.textContent = err.message;
      if (inputEl) inputEl.classList.add('input-error');
    });
    if (errors.length > 0) {
      var firstField = document.getElementById(errors[0].field);
      if (firstField) firstField.focus();
    }
  }
});
