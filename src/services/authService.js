const MOCK_USER = {
  login: 't.test',
  password: 'password',
  name: 'Test User',
  email: 't.test@company.com',
  role: 'admin',
}

const STORAGE_KEY = 'auth_user'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function login(loginValue, passwordValue) {
  await delay(500) // Simulate network delay
  
  if (loginValue === MOCK_USER.login && passwordValue === MOCK_USER.password) {
    const user = { ...MOCK_USER, password: undefined }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return { success: true, user }
  }
  
  return { 
    success: false, 
    error: 'Invalid login or password' 
  }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getCurrentUser() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.warn('Failed to parse user data:', e)
  }
  return null
}

export function isAuthenticated() {
  return getCurrentUser() !== null
}
