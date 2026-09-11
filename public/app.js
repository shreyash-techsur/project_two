document.addEventListener('DOMContentLoaded', function () {
  // Cache DOM references
  var form = document.getElementById('expense-form');
  var amountInput = document.getElementById('amount');
  var descriptionInput = document.getElementById('description');
  var categoryInput = document.getElementById('category');
  var submitBtn = document.getElementById('submit-btn');
  var totalAmountEl = document.getElementById('total-amount');
  var expenseListEl = document.getElementById('expense-list');
  var toastContainer = document.getElementById('toast-container');

  // State — in-memory array of expenses (populated from API)
  var expenses = [];

  // Auto-focus amount field on load (UX-Mockup Flow 2, US-5.2)
  amountInput.focus();

  // Load expenses from API
  loadExpenses();

  // Attach form submit handler
  form.addEventListener('submit', handleSubmit);

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

    // Disable button during request (UX-Mockup: "Saving..." label)
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    fetch('/api/expenses', {
      method: 'POST',
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
          // Success — FRD F0 step 12
          expenses.unshift(result.data.expense); // Prepend (most recent first)
          renderExpenses();
          updateTotal();
          form.reset(); // Clear all fields
          showToast('Expense added!', 'success');
          amountInput.focus(); // Return focus for batch entry (US-0.2)
        } else if (result.status === 400 && result.data.errors) {
          // Server validation errors — display inline
          displayServerErrors(result.data.errors);
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
        submitBtn.textContent = 'Add Expense';
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

      // NO Edit button — F1 deferred per SCOPE-DECISION.md

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
