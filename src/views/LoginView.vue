<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }
  
  if (!email.value.includes('@')) {
    error.value = 'Please enter a valid email'
    return
  }
  
  isLoading.value = true
  
  // Simulate API call
  setTimeout(() => {
    isLoading.value = false
    console.log('Login attempt:', { email: email.value, password: password.value })
  }, 1000)
}
</script>

<template>
  <div class="login-page">
    <div class="login-sidebar">
      <div class="sidebar-content">
        <h1>CRM System</h1>
        <p>Welcome back! Please sign in to continue managing your projects and team.</p>
        
        <div class="features">
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <span>Project Management</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">👥</div>
            <span>Team Collaboration</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📈</div>
            <span>Analytics & Reports</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">⚡</div>
            <span>Fast & Reliable</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="login-main">
      <div class="login-wrapper">
        <div class="login-header">
          <h2>Sign In</h2>
          <p>Enter your credentials to access your account</p>
        </div>
        
        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="name@company.com"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" :disabled="isLoading" />
              <span>Remember me</span>
            </label>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>
          
          <div v-if="error" class="error-message">{{ error }}</div>
          
          <button type="submit" class="login-button" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            {{ isLoading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
        
        <div class="login-footer">
          <p>Don't have an account? <a href="#">Contact administrator</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  width: 100vw;
  overflow-x: hidden;
}

.login-sidebar {
  width: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
}

.sidebar-content {
  max-width: 600px;
  color: white;
}

.sidebar-content h1 {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem 0;
  letter-spacing: -1px;
}

.sidebar-content > p {
  font-size: 1.25rem;
  line-height: 1.6;
  opacity: 0.9;
  margin: 0 0 3rem 0;
}

.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.feature-icon {
  font-size: 2rem;
}

.feature-item span {
  font-size: 1rem;
  font-weight: 500;
}

.login-main {
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 4rem;
}

.login-wrapper {
  width: 100%;
  max-width: 520px;
}

.login-header {
  margin-bottom: 3rem;
}

.login-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
}

.login-header p {
  font-size: 1.125rem;
  color: #666;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group label {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.form-group input[type="email"],
.form-group input[type="password"] {
  padding: 1.125rem 1.25rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1.05rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: #555;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.forgot-link {
  color: #667eea;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  padding: 1rem;
  border-radius: 10px;
  font-size: 1rem;
  text-align: center;
}

.login-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.25rem;
  border-radius: 10px;
  font-size: 1.15rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-footer {
  margin-top: 2.5rem;
  text-align: center;
}

.login-footer p {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

.login-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.login-footer a:hover {
  text-decoration: underline;
}
</style>
