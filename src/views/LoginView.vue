<script setup>
import { ref, onMounted } from 'vue'
import { useTranslation } from '../composables/useTranslation'

const { loadTranslations, t, isLoading, isLoaded } = useTranslation()

const email = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

onMounted(() => {
  loadTranslations('login')
})

const handleSubmit = async () => {
  error.value = ''
  
  if (!email.value || !password.value) {
    error.value = t('login.error.required', 'Please fill in all fields')
    return
  }
  
  if (!email.value.includes('@')) {
    error.value = t('login.error.invalid_email', 'Please enter a valid email')
    return
  }
  
  isSubmitting.value = true
  
  setTimeout(() => {
    isSubmitting.value = false
    console.log('Login attempt:', { email: email.value, password: password.value })
  }, 1000)
}
</script>

<template>
  <div class="login-page">
    <div v-if="!isLoaded" class="loading-container">
      <div class="loading-spinner"></div>
    </div>
    
    <div v-else class="login-content">
      <div class="login-header">
        <h1><T k="login.title" /></h1>
        <p><T k="login.subtitle" /></p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email"><T k="login.email.label" /></label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('login.email.placeholder', 'name@company.com')"
            :disabled="isSubmitting"
          />
        </div>
        
        <div class="form-group">
          <label for="password"><T k="login.password.label" /></label>
          <input
            id="password"
            v-model="password"
            type="password"
            :placeholder="t('login.password.placeholder', 'Enter your password')"
            :disabled="isSubmitting"
          />
        </div>
        
        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" :disabled="isSubmitting" />
            <span><T k="login.remember_me" /></span>
          </label>
          <a href="#" class="forgot-link"><T k="login.forgot_password" /></a>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <button type="submit" class="login-button" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner"></span>
          <span v-if="isSubmitting"><T k="login.signing_in" /></span>
          <span v-else><T k="login.sign_in" /></span>
        </button>
      </form>
      
      <div class="login-footer">
        <p>
          <T k="login.no_account" />
          <a href="#"><T k="login.contact_admin" /></a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  overflow-x: hidden;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-content {
  width: 100%;
  max-width: 520px;
  padding: 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 3rem;
}

.login-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.5px;
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
  color: #1a1a2e;
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
