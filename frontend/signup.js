document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    document.getElementById('signupError').textContent = 'Passwords do not match';
    document.getElementById('signupError').classList.remove('hidden');
    return;
  }

  document.getElementById('signupBtn').disabled = true;
  document.getElementById('signupLoading').classList.remove('hidden');

  try {
    const response = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } else {
      document.getElementById('signupError').textContent = data.error || 'Signup failed';
      document.getElementById('signupError').classList.remove('hidden');
    }
  } catch (error) {
    document.getElementById('signupError').textContent = 'Network error. Please try again.';
    document.getElementById('signupError').classList.remove('hidden');
  } finally {
    document.getElementById('signupBtn').disabled = false;
    document.getElementById('signupLoading').classList.add('hidden');
  }
});
