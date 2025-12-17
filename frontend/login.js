const API_BASE = "http://localhost:5000/api";

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');
  const loginLoading = document.getElementById('loginLoading');
  const loginError = document.getElementById('loginError');

  // Show loading
  loginBtn.disabled = true;
  loginLoading.classList.remove('hidden');
  loginError.classList.add('hidden');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } else {
      displayLoginError(data.error || 'Login failed');
    }
  } catch (error) {
    displayLoginError('Network error: ' + error.message);
  } finally {
    loginBtn.disabled = false;
    loginLoading.classList.add('hidden');
  }
});

function displayLoginError(message) {
  const loginError = document.getElementById('loginError');
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}
