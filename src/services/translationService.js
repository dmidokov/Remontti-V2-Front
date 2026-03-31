// Mock translations data
const mockTranslations = {
  login: {
    'login.title': 'CRM System',
    'login.subtitle': 'Enter your credentials to access your account',
    'login.email.label': 'Email Address',
    'login.email.placeholder': 'name@company.com',
    'login.password.label': 'Password',
    'login.password.placeholder': 'Enter your password',
    'login.remember_me': 'Remember me',
    'login.forgot_password': 'Forgot password?',
    'login.sign_in': 'Sign In',
    'login.signing_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.contact_admin': 'Contact administrator',
    'login.error.required': 'Please fill in all fields',
    'login.error.invalid_email': 'Please enter a valid email',
  },
  dashboard: {
    // Dashboard translations will be added later
  },
}

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchTranslations(page) {
  // In production, this will be a real API call:
  // const response = await fetch(`/api/translations/${page}`)
  // return await response.json()
  
  await delay(300) // Simulate network delay
  
  const translations = mockTranslations[page] || {}
  
  if (!translations) {
    console.warn(`No translations found for page: ${page}`)
  }
  
  return translations
}
