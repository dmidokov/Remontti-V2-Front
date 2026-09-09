import { kvGet, getAll } from '../db'
import { getCurrentHost } from '../utils/host'
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TranslationResponse,
  GetBranchesResponse,
  NavItem,
  Branch,
  User,
  UserAuth,
} from '../types/api'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const MOCK_BRANCHES: Branch[] = [
  {
    id: 1,
    name: 'Плаза',
    code: 'plaza',
    address: 'ТЦ Плаза, ул. Примерная 1',
    isActive: true,
  },
  {
    id: 2,
    name: 'Мастерская',
    code: 'workshop',
    address: 'ул. Рабочая 15',
    isActive: true,
  },
]

const MOCK_TRANSLATIONS: Record<string, TranslationResponse> = {
  login: {
    'login.title': 'Ремонтти Версия 2.0',
    'login.subtitle': 'Enter your credentials to access your account',
    'login.login.label': 'Login',
    'login.login.placeholder': 'john.doe',
    'login.password.label': 'Password',
    'login.password.placeholder': 'Enter your password',
    'login.remember_me': 'Запомни меня',
    'login.forgot_password': 'Forgot password?',
    'login.sign_in': 'Войти',
    'login.signing_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.contact_admin': 'Contact administrator',
    'login.error.required': 'Please fill in all fields',
    'login.error.invalid_format': 'Please enter a valid login (format: string.string)',
    'login.error.invalid_credentials': 'Invalid login or password',
  },
  dashboard: {
    'dashboard.title': 'CRM System',
    'dashboard.logout': 'Logout',
    'dashboard.welcome': 'Welcome back!',
    'dashboard.welcome_text': 'Here\'s what\'s happening with your projects today.',
    'dashboard.projects': 'Projects',
    'dashboard.team_members': 'Team Members',
    'dashboard.completed': 'Completed',
    'dashboard.in_progress': 'In Progress',
  },
  branches: {
    'branches.title': 'Выберите филиал',
    'branches.subtitle': 'Где вы будете работать сегодня?',
    'branches.status.active': 'Активен',
    'branches.status.inactive': 'Не активен',
    'branches.continue': 'Продолжить',
    'branches.submitting': 'Загрузка...',
    'branches.error.load_failed': 'Не удалось загрузить список филиалов',
    'branches.error.select_branch': 'Пожалуйста, выберите филиал',
  },
  management: {
    'management.users': 'Работники',
    'management.users_desc': 'Управление работниками. Создание/редактирование/удаление',
    'management.branches': 'Филиалы',
    'management.manage': 'Открыть',
    'management.welcome': 'Управление',
    'management.description': 'общие настройки / меню и описание будут редактироваться - эти надпи для теста ',
  },
}

/** Эмуляция бэкенда на IndexedDB + localStorage. Методы повторяют интерфейс реального ApiClient. */
export class MockApiClient {
  async login(data: LoginRequest): Promise<LoginResponse> {
    await delay(500)

    const currentHost = getCurrentHost()
    const credentials = await kvGet<Record<string, string>>('credentials')
    const storedPassword = credentials?.[data.login]

    if (storedPassword && data.password === storedPassword) {
      const users = await getAll<User>('users')
      const user = users.find(u => u.login === data.login)

      if (user) {
        // Проверяем соответствие поддомена
        if (user.host && user.host !== 'localhost' && user.host !== currentHost && currentHost !== 'localhost') {
          return {
            success: false,
            error: 'Этот пользователь не доступен на данном поддомене',
          }
        }

        const userAuth: UserAuth = { ...user }
        return { success: true, user: userAuth }
      }
    }

    return {
      success: false,
      error: 'Invalid login or password',
    }
  }

  async logout(): Promise<LogoutResponse> {
    return { success: true }
  }

  async getTranslations(page: string): Promise<TranslationResponse> {
    await delay(300)
    return MOCK_TRANSLATIONS[page] || {}
  }

  async getBranches(): Promise<GetBranchesResponse> {
    await delay(300)
    return { success: true, branches: MOCK_BRANCHES }
  }

  async getNavigation(): Promise<NavItem[]> {
    await delay(300)
    return getAll<NavItem>('navigation')
  }
}

export const mockApiClient = new MockApiClient()
export { MOCK_TRANSLATIONS }