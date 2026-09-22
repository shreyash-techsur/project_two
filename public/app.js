document.addEventListener('DOMContentLoaded', function () {
  // --- Token Management ---
  var accessToken = localStorage.getItem('access_token');
  var refreshTokenValue = localStorage.getItem('refresh_token');
  var authUser = null;
  try { authUser = JSON.parse(localStorage.getItem('auth_user')); } catch (e) {}

  // Redirect to login if no tokens at all
  if (!accessToken && !refreshTokenValue) {
    window.location.href = '/login.html';
    return;
  }

  // Flag to prevent concurrent refresh attempts
  var isRefreshing = false;
  // Queue of callbacks waiting for a token refresh to complete
  var refreshQueue = [];

  /**
   * Refresh the access token using the refresh token.
   * Returns a Promise that resolves to the new access token or null if refresh failed.
   * Multiple callers are coalesced — only one refresh request at a time.
   */
  function refreshAccessToken() {
    if (isRefreshing) {
      // Already refreshing — queue this caller
      return new Promise(function (resolve) {
        refreshQueue.push(resolve);
      });
    }

    isRefreshing = true;

    return fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (result) {
        isRefreshing = false;

        if (result.status === 200) {
          // Store new tokens
          accessToken = result.data.accessToken;
          refreshTokenValue = result.data.refreshToken;
          authUser = result.data.user;
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshTokenValue);
          localStorage.setItem('auth_user', JSON.stringify(authUser));

          // Resolve all queued callers with the new token
          refreshQueue.forEach(function (cb) { cb(accessToken); });
          refreshQueue = [];

          return accessToken;
        } else {
          // Refresh failed — force re-login
          refreshQueue.forEach(function (cb) { cb(null); });
          refreshQueue = [];
          forceLogout();
          return null;
        }
      })
      .catch(function () {
        isRefreshing = false;
        refreshQueue.forEach(function (cb) { cb(null); });
        refreshQueue = [];
        // Network error during refresh — don't force logout, let retry happen
        return null;
      });
  }

  /**
   * Make an authenticated API request.
   * Automatically retries once with a refreshed token if the server returns 401.
   *
   * @param {string} url - The API URL
   * @param {Object} options - fetch options (method, body, etc.)
   * @returns {Promise<{status: number, data: Object}>}
   */
  function apiFetch(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + accessToken;
    if (options.body && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    return fetch(url, options)
      .then(function (response) {
        if (response.status === 401) {
          // Token expired — try to refresh and retry
          return refreshAccessToken().then(function (newToken) {
            if (!newToken) {
              // Refresh failed — return the 401 as-is
              return response.json().then(function (data) {
                return { status: 401, data: data };
              });
            }
            // Retry with new token
            options.headers['Authorization'] = 'Bearer ' + newToken;
            return fetch(url, options).then(function (retryResponse) {
              return retryResponse.json().then(function (data) {
                return { status: retryResponse.status, data: data };
              });
            });
          });
        }
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      });
  }

  function forceLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login.html';
  }

  // Verify current token is still valid (or refresh it)
  apiFetch('/api/auth/me', { method: 'GET' })
    .then(function (result) {
      if (result.status === 401) {
        forceLogout();
      } else if (result.data && result.data.user) {
        authUser = result.data.user;
        localStorage.setItem('auth_user', JSON.stringify(authUser));
        // Update username display
        if (userLabel) {
          userLabel.textContent = 'Logged in as ' + authUser.username;
        }
      }
    })
    .catch(function () {
      // Network error — allow offline usage with cached data
    });

  // Cache DOM references
  var form = document.getElementById('expense-form');
  var amountInput = document.getElementById('amount');
  var descriptionInput = document.getElementById('description');
  var categoryInput = document.getElementById('category');
  var submitBtn = document.getElementById('submit-btn');
  var cancelBtn = document.getElementById('cancel-btn');
  var editIndicator = document.getElementById('edit-indicator');
  var totalAmountEl = document.getElementById('total-amount');
  var expenseListEl = document.getElementById('expense-list');
  var toastContainer = document.getElementById('toast-container');

  // Show logged-in user info and logout button
  var headerEl = document.querySelector('.app-header');
  var userBar = document.createElement('div');
  userBar.className = 'user-bar';
  var userLabel = document.createElement('span');
  userLabel.className = 'user-label';
  userLabel.textContent = 'Logged in as ' + (authUser ? authUser.username : 'User');
  var logoutBtn = document.createElement('button');
  logoutBtn.className = 'logout-btn';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', function () {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    }).finally(function () {
      forceLogout();
    });
  });
  userBar.appendChild(userLabel);
  userBar.appendChild(logoutBtn);
  headerEl.appendChild(userBar);

  // State — in-memory array of expenses (populated from API)
  var expenses = [];

  // ID of the expense currently being edited, or null in add mode (US-1.1)
  var editingId = null;

  // localStorage key for backup (scoped per user)
  var BACKUP_KEY = 'expense_tracker_backup_' + (authUser ? authUser.id : 'default');

  // Auto-focus amount field on load (UX-Mockup Flow 2, US-5.2)
  amountInput.focus();

  // Load expenses from API
  loadExpenses();

  // Attach form submit handler
  form.addEventListener('submit', handleSubmit);

  // Cancel discards pending edits with no server call (FRD F01 step 7).
  cancelBtn.addEventListener('click', function () { exitEditMode(); });

  // --- Persistence Monitor ---
  // Periodically check if the DB was successfully pushed to git
  setInterval(function () {
    fetch('/api/health/persistence')
      .then(function (res) { return res.json(); })
      .then(function (status) {
        if (!status.success && status.error) {
          console.warn('[persistence] DB push issue:', status.error);
          showToast('Warning: Data may not be saved permanently. ' + status.error, 'error');
        }
      })
      .catch(function () {
        // Health endpoint unavailable — ignore
      });
  }, 5 * 60 * 1000); // Check every 5 minutes

  // --- API Communication ---

  function loadExpenses() {
    // Show loading state
    expenseListEl.innerHTML = '';
    var loadingEl = document.createElement('p');
    loadingEl.className = 'loading-state';
    loadingEl.textContent = 'Loading expenses...';
    expenseListEl.appendChild(loadingEl);
    totalAmountEl.textContent = '...';

    apiFetch('/api/expenses', { method: 'GET' })
      .then(function (result) {
        if (result.status === 401) {
          forceLogout();
          throw new Error('Not authenticated');
        }
        if (result.status !== 200) {
          throw new Error('Server error');
        }

        expenses = result.data.expenses;

        // If server returned empty but we have a local backup, auto-restore
        if (expenses.length === 0) {
          var backup = getBackup();
          if (backup && backup.length > 0) {
            restoreFromBackup(backup);
            return; // restoreFromBackup will call renderExpenses/updateTotal
          }
        }

        // Save current state as backup
        saveBackup(expenses);
        renderExpenses();
        updateTotal();
      })
      .catch(function (err) {
        // Show error state (UX-Mockup Error State, US-3.4)
        expenseListEl.innerHTML = '';
        var errorDiv = document.createElement('div');
        errorDiv.className = 'list-error';

        var errorMsg = document.createElement('p');
        // Distinguish network error from server error (US-5.5)
        errorMsg.textContent = err.message === 'Failed to fetch'
          ? 'Unable to connect to the server. Check your connection and try again.'
          : 'Failed to load expenses. Please try again.';
        errorDiv.appendChild(errorMsg);

        var retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', loadExpenses);
        errorDiv.appendChild(retryBtn);

        expenseListEl.appendChild(errorDiv);
        totalAmountEl.textContent = '\u2014'; // em dash
      });
  }

  // --- Local Backup (survives sandbox rebuilds via browser localStorage) ---

  function saveBackup(expenseList) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        timestamp: new Date().toISOString(),
        expenses: expenseList
      }));
    } catch (e) {
      // localStorage might be full or unavailable — fail silently
    }
  }

  function getBackup() {
    try {
      var raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data.expenses || null;
    } catch (e) {
      return null;
    }
  }

  function restoreFromBackup(backupExpenses) {
    showToast('Restoring your data from local backup...', 'success');

    apiFetch('/api/expenses/import', {
      method: 'POST',
      body: JSON.stringify({ expenses: backupExpenses })
    })
      .then(function (result) {
        if (result.data && result.data.expenses) {
          expenses = result.data.expenses;
          saveBackup(expenses);
          renderExpenses();
          updateTotal();
          var count = result.data.imported || 0;
          if (count > 0) {
            showToast(count + ' expense(s) restored successfully!', 'success');
          }
        }
      })
      .catch(function () {
        // If restore fails, just show backup data locally (read-only fallback)
        expenses = backupExpenses;
        renderExpenses();
        updateTotal();
        showToast('Showing cached data. Server may be unavailable.', 'error');
      });
  }

  // --- Form Handling ---

  function handleSubmit(event) {
    event.preventDefault();

    // Clear previous errors
    clearErrors();

    // Client-side validation
    var errors = validateForm();
    if (errors.length > 0) {
      displayErrors(errors);
      return;
    }

    // Capture mode for this request — editingId can change while in flight
    var isEdit = editingId !== null;
    var targetId = editingId;

    // Disable button during request
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    apiFetch(isEdit ? '/api/expenses/' + targetId : '/api/expenses', {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify({
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value.trim(),
        category: categoryInput.value.trim()
      })
    })
      .then(function (result) {
        if (result.status === 201) {
          // Created
          expenses.unshift(result.data.expense);
          renderExpenses();
          updateTotal();
          saveBackup(expenses);
          form.reset();
          showToast('Expense added!', 'success');
          amountInput.focus();
        } else if (result.status === 200) {
          // Updated
          var updated = result.data.expense;
          var idx = expenses.findIndex(function (e) { return e.id === updated.id; });
          if (idx !== -1) expenses[idx] = updated;
          exitEditMode();
          updateTotal();
          saveBackup(expenses);
          showToast('Expense updated!', 'success');
          amountInput.focus();
        } else if (result.status === 400 && result.data.errors) {
          // Server validation errors — display inline
          displayServerErrors(result.data.errors);
        } else if (result.status === 404) {
          showToast('Expense not found. It may have been removed.', 'error');
          exitEditMode(true);
          loadExpenses();
        } else if (result.status === 401) {
          // Auth failed even after refresh — force logout
          forceLogout();
        } else {
          showToast('Failed to save expense. Please try again.', 'error');
        }
      })
      .catch(function () {
        showToast('Unable to connect to the server. Check your connection and try again.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = editingId !== null ? 'Save Changes' : 'Add Expense';
      });
  }

  // --- Edit Mode (F1) ---

  function enterEditMode(expense) {
    editingId = expense.id;

    // Populate form with current values; amount is cents -> dollars
    amountInput.value = (expense.amount / 100).toFixed(2);
    descriptionInput.value = expense.description;
    categoryInput.value = expense.category;

    // Visual edit-mode indicators
    submitBtn.textContent = 'Save Changes';
    cancelBtn.style.display = '';
    editIndicator.style.display = '';

    clearErrors();
    renderExpenses();
    amountInput.focus();
  }

  function exitEditMode(preserveInput) {
    editingId = null;
    if (!preserveInput) form.reset();
    clearErrors();

    submitBtn.textContent = 'Add Expense';
    cancelBtn.style.display = 'none';
    editIndicator.style.display = 'none';

    renderExpenses();
  }

  // --- Delete ---

  function handleDelete(expense) {
    if (editingId === expense.id) {
      exitEditMode();
    }

    if (!confirm('Delete "' + expense.description + '" (' + formatCurrency(expense.amount) + ')?')) {
      return;
    }

    apiFetch('/api/expenses/' + expense.id, { method: 'DELETE' })
      .then(function (result) {
        if (result.status === 200) {
          expenses = expenses.filter(function (e) { return e.id !== expense.id; });
          renderExpenses();
          updateTotal();
          saveBackup(expenses);
          showToast('Expense deleted!', 'success');
        } else if (result.status === 404) {
          showToast('Expense not found. It may have already been removed.', 'error');
          loadExpenses();
        } else {
          showToast('Failed to delete expense. Please try again.', 'error');
        }
      })
      .catch(function () {
        showToast('Unable to connect to the server. Check your connection and try again.', 'error');
      });
  }

  // --- Client-Side Validation ---

  function validateForm() {
    var errors = [];
    var amount = amountInput.value.trim();
    var description = descriptionInput.value;
    var category = categoryInput.value;

    // Amount validation
    if (amount === '') {
      errors.push({ field: 'amount', message: 'Amount is required' });
    } else if (isNaN(parseFloat(amount)) || !isFinite(amount)) {
      errors.push({ field: 'amount', message: 'Amount must be a valid number' });
    } else {
      var numAmount = parseFloat(amount);
      if (numAmount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be greater than zero' });
      }
      if (numAmount > 999999.99) {
        errors.push({ field: 'amount', message: 'Amount must not exceed 999,999.99' });
      }
      var parts = amount.split('.');
      if (parts.length === 2 && parts[1].length > 2) {
        errors.push({ field: 'amount', message: 'Amount must have at most two decimal places' });
      }
    }

    // Description validation
    if (!description || description.trim() === '') {
      errors.push({ field: 'description', message: 'Description is required' });
    } else if (description.length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }

    // Category validation
    if (!category || category.trim() === '') {
      errors.push({ field: 'category', message: 'Category is required' });
    } else if (category.length > 100) {
      errors.push({ field: 'category', message: 'Category must not exceed 100 characters' });
    }

    return errors;
  }

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

  function displayServerErrors(serverErrors) {
    var fieldMap = {
      'ERR_EXPENSE_AMOUNT_REQUIRED': 'amount',
      'ERR_EXPENSE_INVALID_AMOUNT': 'amount',
      'ERR_EXPENSE_AMOUNT_POSITIVE': 'amount',
      'ERR_EXPENSE_AMOUNT_TOO_LARGE': 'amount',
      'ERR_EXPENSE_AMOUNT_PRECISION': 'amount',
      'ERR_EXPENSE_DESC_REQUIRED': 'description',
      'ERR_EXPENSE_DESC_TOO_LONG': 'description',
      'ERR_EXPENSE_CAT_REQUIRED': 'category',
      'ERR_EXPENSE_CAT_TOO_LONG': 'category'
    };
    var mappedErrors = serverErrors.map(function (e) {
      return {
        field: fieldMap[e.code] || 'amount',
        message: e.message
      };
    });
    displayErrors(mappedErrors);
  }

  // --- List Rendering ---

  function renderExpenses() {
    expenseListEl.innerHTML = '';

    if (expenses.length === 0) {
      var emptyEl = document.createElement('p');
      emptyEl.className = 'empty-state';
      emptyEl.textContent = 'No expenses yet. Add your first expense above!';
      expenseListEl.appendChild(emptyEl);
      return;
    }

    expenses.forEach(function (expense) {
      var row = document.createElement('div');
      row.className = 'expense-row';

      var amountEl = document.createElement('span');
      amountEl.className = 'expense-amount';
      amountEl.textContent = formatCurrency(expense.amount);

      var descEl = document.createElement('span');
      descEl.className = 'expense-description';
      descEl.textContent = expense.description;

      var catEl = document.createElement('span');
      catEl.className = 'expense-category';
      catEl.textContent = expense.category;

      row.appendChild(amountEl);
      row.appendChild(descEl);
      row.appendChild(catEl);

      var actionsEl = document.createElement('span');
      actionsEl.className = 'expense-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'expense-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('data-id', String(expense.id));
      editBtn.setAttribute('aria-label', 'Edit ' + expense.description);
      editBtn.addEventListener('click', function () { enterEditMode(expense); });
      actionsEl.appendChild(editBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'expense-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-id', String(expense.id));
      deleteBtn.setAttribute('aria-label', 'Delete ' + expense.description);
      deleteBtn.addEventListener('click', function () { handleDelete(expense); });
      actionsEl.appendChild(deleteBtn);

      row.appendChild(actionsEl);

      if (editingId === expense.id) {
        row.classList.add('editing-row');
      }

      expenseListEl.appendChild(row);
    });
  }

  // --- Total Calculation ---

  function updateTotal() {
    var totalCents = expenses.reduce(function (sum, exp) { return sum + exp.amount; }, 0);
    totalAmountEl.textContent = formatCurrency(totalCents);
  }

  function formatCurrency(cents) {
    var dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dollars);
  }

  // --- Toast Notifications ---

  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'slideOut 0.3s forwards';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // --- Global Error Handler ---

  window.addEventListener('error', function () {
    var existing = document.querySelector('.global-error');
    if (!existing) {
      var errorBanner = document.createElement('div');
      errorBanner.className = 'global-error';
      errorBanner.textContent = 'Something went wrong. Please refresh the page.';
      errorBanner.style.cssText = 'background:#e74c3c;color:white;padding:12px;text-align:center;position:fixed;top:0;left:0;right:0;z-index:9999;';
      document.body.prepend(errorBanner);
    }
  });
});
