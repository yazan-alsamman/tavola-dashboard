/** Domain query keys — always include restaurant/branch when scoped. */

export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (page: number, pageSize: number) =>
    [...reservationKeys.lists(), page, pageSize] as const,
  calendarDay: (date: string, restaurantId: string | null) =>
    [...reservationKeys.all, 'calendar', date, restaurantId ?? ''] as const,
  calendarRange: (
    from: string,
    to: string,
    restaurantId: string | null,
  ) =>
    [
      ...reservationKeys.all,
      'calendar-range',
      from,
      to,
      restaurantId ?? '',
    ] as const,
  detail: (id: string) => [...reservationKeys.all, 'detail', id] as const,
  availability: (
    restaurantId: string,
    branchId: string,
    date: string,
    partySize: number,
  ) =>
    [
      ...reservationKeys.all,
      'availability',
      restaurantId,
      branchId,
      date,
      partySize,
    ] as const,
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (page: number, pageSize: number, unread?: boolean) =>
    [...notificationKeys.all, 'list', page, pageSize, unread ?? false] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

export const waitlistKeys = {
  all: ['waitlist'] as const,
  session: () => [...waitlistKeys.all, 'session'] as const,
}

export const employeeKeys = {
  all: ['employees'] as const,
  restaurant: (restaurantId: string) =>
    [...employeeKeys.all, restaurantId] as const,
}

export const menuKeys = {
  all: ['menus'] as const,
  lists: (restaurantId: string) =>
    [...menuKeys.all, 'list', restaurantId] as const,
  detail: (restaurantId: string, menuId: string) =>
    [...menuKeys.all, 'detail', restaurantId, menuId] as const,
  default: (restaurantId: string) =>
    [...menuKeys.all, 'default', restaurantId] as const,
}

export const offerKeys = {
  all: ['offers'] as const,
  list: (restaurantId: string, page: number, pageSize: number) =>
    [...offerKeys.all, restaurantId, page, pageSize] as const,
}

export const messagingKeys = {
  all: ['messaging'] as const,
  inbox: (restaurantId: string) =>
    [...messagingKeys.all, 'inbox', restaurantId] as const,
  conversation: (conversationId: string) =>
    [...messagingKeys.all, 'conversation', conversationId] as const,
  messages: (conversationId: string) =>
    [...messagingKeys.all, 'messages', conversationId] as const,
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  reservationsSummary: (restaurantId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'reservations-summary', restaurantId, from, to] as const,
  orgReservationsSummary: (from: string, to: string) =>
    [...analyticsKeys.all, 'org-reservations-summary', from, to] as const,
  trends: (restaurantId: string, branchId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'trends', restaurantId, branchId, from, to] as const,
  peakHours: (restaurantId: string, branchId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'peak-hours', restaurantId, branchId, from, to] as const,
  customers: (restaurantId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'customers', restaurantId, from, to] as const,
  waitlist: (restaurantId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'waitlist', restaurantId, from, to] as const,
  reviewsSummary: (restaurantId: string) =>
    [...analyticsKeys.all, 'reviews-summary', restaurantId] as const,
}

export const reviewKeys = {
  all: ['reviews'] as const,
  restaurant: (restaurantId: string, page: number, pageSize: number) =>
    [...reviewKeys.all, 'restaurant', restaurantId, page, pageSize] as const,
  detail: (reviewId: string) => [...reviewKeys.all, 'detail', reviewId] as const,
}

export const orgKeys = {
  all: ['organization'] as const,
  subscription: () => [...orgKeys.all, 'subscription'] as const,
  usage: () => [...orgKeys.all, 'usage'] as const,
}
