document.addEventListener('DOMContentLoaded', function () {
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

  // State — in-memory array of expenses (populated from API)
  var expenses = [];

  // ID of the expense currently being edited, or null in add mode (US-1.1)
  var editingId = null;

  // localStorage key for backup
  var BACKUP_KEY = 'expense_tracker_backup';

  // Auto-focus amount field on load (UX-Mockup Flow 2, US-5.2)
  amountInput.focus();

  // Load expenses from API
  loadExpenses();

  // Attach form submit handler
  form.addEventListener('submit', handleSubmit);

  // Cancel discards pending edits with no server call (FRD F01 step 7).
  // Wrapped so the click Event is not passed through as `preserveInput`.
  cancelBtn.addEventListener('click', function () { exitEditMode(); });

  // --- API Communication ---

  function loadExpenses() {
    // Show loading state
    expenseListEl.innerHTML = '';
    var loadingEl = document.createElement('p');
    loadingEl.className = 'loading-state';
    loadingEl.textContent = 'Loading expenses...';
    expenseListEl.appendChild(loadingEl);
    totalAmountEl.textContent = '...';

    fetch('/api/expenses')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Server error');
        }
        return response.json();
      })
      .then(function (data) {
        expenses = data.expenses;

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
        totalAmountEl.textContent = '\u2014'; // em dash "—" (US-4.4)
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

    fetch('/api/expenses/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses: backupExpenses })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.expenses) {
          expenses = data.expenses;
          saveBackup(expenses);
          renderExpenses();
          updateTotal();
          var count = data.imported || 0;
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

    // Disable button during request (UX-Mockup: "Saving..." label)
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    fetch(isEdit ? '/api/expenses/' + targetId : '/api/expenses', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value.trim(),
        category: categoryInput.value.trim()
      })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 201) {
          // Created — FRD F0 step 12
          expenses.unshift(result.data.expense); // Prepend (most recent first)
          renderExpenses();
          updateTotal();
          saveBackup(expenses); // Persist to localStorage
          form.reset(); // Clear all fields
          showToast('Expense added!', 'success');
          amountInput.focus(); // Return focus for batch entry (US-0.2)
        } else if (result.status === 200) {
          // Updated — FRD F01 step 6j–6m: replace row in place, recalc total, exit edit mode
          var updated = result.data.expense;
          var idx = expenses.findIndex(function (e) { return e.id === updated.id; });
          if (idx !== -1) expenses[idx] = updated;
          exitEditMode(); // clears form and re-renders
          updateTotal();
          saveBackup(expenses); // Persist to localStorage
          showToast('Expense updated!', 'success');
          amountInput.focus();
        } else if (result.status === 400 && result.data.errors) {
          // Server validation errors — display inline
          displayServerErrors(result.data.errors);
        } else if (result.status === 404) {
          // Expense vanished between load and save (FRD F01 outputs: not-found).
          // Return to add-new state but keep the typed values so the user can
          // re-submit them as a new expense (US-1.4 AC).
          showToast('Expense not found. It may have been removed.', 'error');
          exitEditMode(true); // preserve input
          loadExpenses();
        } else {
          // Unexpected error
          showToast('Failed to save expense. Please try again.', 'error');
        }
      })
      .catch(function () {
        // Network error — US-5.5
        showToast('Unable to connect to the server. Check your connection and try again.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        // Restore the label for whichever mode we are in now
        submitBtn.textContent = editingId !== null ? 'Save Changes' : 'Add Expense';
      });
  }

  // --- Edit Mode (F1) ---

  function enterEditMode(expense) {
    editingId = expense.id;

    // Populate form with current values (FRD F01 step 3); amount is cents -> dollars
    amountInput.value = (expense.amount / 100).toFixed(2);
    descriptionInput.value = expense.description;
    categoryInput.value = expense.category;

    // Visual edit-mode indicators (FRD F01 step 4)
    submitBtn.textContent = 'Save Changes';
    cancelBtn.style.display = '';
    editIndicator.style.display = '';

    clearErrors();
    renderExpenses(); // re-render to highlight the row being edited
    amountInput.focus();
  }

  // preserveInput=true leaves the typed field values in place while still
  // returning the form to add-new state (US-1.4: 404 must not clear the form).
  function exitEditMode(preserveInput) {
    editingId = null;
    if (!preserveInput) form.reset();
    clearErrors();

    submitBtn.textContent = 'Add Expense';
    cancelBtn.style.display = 'none';
    editIndicator.style.display = 'none';

    renderExpenses(); // clears the row highlight
  }

  // --- Delete ---

  function handleDelete(expense) {
    // If currently editing this expense, exit edit mode first
    if (editingId === expense.id) {
      exitEditMode();
    }

    // Confirm before deleting
    if (!confirm('Delete "' + expense.description + '" (' + formatCurrency(expense.amount) + ')?')) {
      return;
    }

    fetch('/api/expenses/' + expense.id, {
      method: 'DELETE'
    })
      .then(function (response) {
        if (response.status === 200) {
          // Remove from local array
          expenses = expenses.filter(function (e) { return e.id !== expense.id; });
          renderExpenses();
          updateTotal();
          saveBackup(expenses);
          showToast('Expense deleted!', 'success');
        } else if (response.status === 404) {
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
      // Precision check — more than 2 decimal places
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
    // Focus first invalid field (UX-Mockup Interaction Pattern: Form Submission step 3)
    if (errors.length > 0) {
      var firstField = document.getElementById(errors[0].field);
      if (firstField) firstField.focus();
    }
  }

  function displayServerErrors(serverErrors) {
    // Map server error codes to field names
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
    expenseListEl.innerHTML = ''; // Clear current content

    if (expenses.length === 0) {
      // Empty state (US-3.2, UX-Mockup Empty State)
      var emptyEl = document.createElement('p');
      emptyEl.className = 'empty-state';
      emptyEl.textContent = 'No expenses yet. Add your first expense above!';
      expenseListEl.appendChild(emptyEl);
      return;
    }

    // Render each expense as a row (US-3.1)
    expenses.forEach(function (expense) {
      var row = document.createElement('div');
      row.className = 'expense-row';

      var amountEl = document.createElement('span');
      amountEl.className = 'expense-amount';
      amountEl.textContent = formatCurrency(expense.amount); // cents -> $X.XX

      var descEl = document.createElement('span');
      descEl.className = 'expense-description';
      descEl.textContent = expense.description; // textContent for XSS prevention (TechArch S5)

      var catEl = document.createElement('span');
      catEl.className = 'expense-category';
      catEl.textContent = expense.category; // textContent for XSS prevention

      row.appendChild(amountEl);
      row.appendChild(descEl);
      row.appendChild(catEl);

      // Action buttons container
      var actionsEl = document.createElement('span');
      actionsEl.className = 'expense-actions';

      // Edit button (US-1.1, FRD F01 step 2)
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'expense-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('data-id', String(expense.id));
      editBtn.setAttribute('aria-label', 'Edit ' + expense.description);
      editBtn.addEventListener('click', function () { enterEditMode(expense); });
      actionsEl.appendChild(editBtn);

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'expense-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-id', String(expense.id));
      deleteBtn.setAttribute('aria-label', 'Delete ' + expense.description);
      deleteBtn.addEventListener('click', function () { handleDelete(expense); });
      actionsEl.appendChild(deleteBtn);

      row.appendChild(actionsEl);

      // Highlight the row currently in edit mode
      if (editingId === expense.id) {
        row.classList.add('editing-row');
      }

      expenseListEl.appendChild(row);
    });
  }

  // --- Total Calculation ---

  function updateTotal() {
    // Sum all amounts using integer cents arithmetic (US-4.1, FRD F4 process step 1)
    var totalCents = expenses.reduce(function (sum, exp) { return sum + exp.amount; }, 0);
    totalAmountEl.textContent = formatCurrency(totalCents);
  }

  function formatCurrency(cents) {
    // Convert cents to dollars and format (US-4.1: $X,XXX.XX)
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

    // Auto-dismiss after 2 seconds (UX-Mockup Success Toast pattern)
    setTimeout(function () {
      toast.style.animation = 'slideOut 0.3s forwards';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // --- Global Error Handler ---

  window.addEventListener('error', function () {
    // Fallback for unhandled JS errors (US-5.5)
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
