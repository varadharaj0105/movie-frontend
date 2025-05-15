// Sign up form handling
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
  
    try {
      const response = await axios.post('http://localhost:3001/api/auth/signup', {
        username,
        email,
        password,
      });
      document.getElementById('message').textContent = 'Signup successful!';
    } catch (error) {
      document.getElementById('message').textContent = `Error: ${error.response.data.error || error.message}`;
    }
  });
  
  // Login form handling
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
  
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password,
      });
      document.getElementById('message').textContent = 'Login successful!';
    } catch (error) {
      document.getElementById('message').textContent = `Error: ${error.response.data.message || error.message}`;
    }
  });
  