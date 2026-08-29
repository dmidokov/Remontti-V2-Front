import { getAll, syncStore } from '../db'
import type { ManagementCard } from '../types/api'

const INITIAL_CARDS: ManagementCard[] = [
  {
    id: 1,
    title: 'Пользователи',
    description: 'Управление пользователями системы: добавление, редактирование, удаление и назначение ролей',
    iconUrl: '/icons/management/users.svg',
    requiredBit: 0b00001, // bit 0
    link: '/users',
  },
  {
    id: 2,
    title: 'Настройки системы',
    description: 'Общие настройки приложения: параметры компании, email-уведомления, интеграции',
    iconUrl: '/icons/management/settings.svg',
    requiredBit: 0b00010, // bit 1
    link: '/settings',
  },
  {
    id: 3,
    title: 'Роли и права',
    description: 'Настройка ролей, битовых прав доступа и ограничений для разных групп пользователей',
    iconUrl: '/icons/management/roles.svg',
    requiredBit: 0b00100, // bit 2
    link: '/roles',
  },
  {
    id: 4,
    title: 'Безопасность',
    description: 'Политики паролей, двухфакторная аутентификация, журналы доступа и аудита',
    iconUrl: '/icons/management/security.svg',
    requiredBit: 0b01000, // bit 3
    link: '/security',
  },
  {
    id: 5,
    title: 'Бэкапы и данные',
    description: 'Резервное копирование, импорт/экспорт данных, очистка и обслуживание базы данных',
    iconUrl: '/icons/management/backups.svg',
    requiredBit: 0b10000, // bit 4
    link: '/backups',
  },
]

export async function seedManagementCards(): Promise<void> {
  console.log('[ManagementCards] Seeding...')
  await syncStore('managementCards', INITIAL_CARDS)
  const cards = await getAll<ManagementCard>('managementCards')
  console.log(`[ManagementCards] Seeded ${cards.length} cards`)
}

export async function getManagementCards(userSettingsRight: number = 0): Promise<ManagementCard[]> {
  const allCards = await getAll<ManagementCard>('managementCards')
  // Фильтруем: возвращаем только карточки, у которых requiredBit установлен в settings_right
  return allCards.filter(card => {console.log(card); (userSettingsRight & card.requiredBit) !== 0})
}

export async function getAllManagementCards(): Promise<ManagementCard[]> {
  return getAll<ManagementCard>('managementCards')
}
