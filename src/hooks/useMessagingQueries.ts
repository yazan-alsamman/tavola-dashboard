import { useQuery } from '@tanstack/react-query'
import {
  getConversation,
  listConversationMessages,
  listRestaurantConversations,
  type ConversationDto,
} from '@/api/messaging'
import { messagingKeys } from '@/lib/queryKeys'

/** Unread count when explicitly present on the conversation DTO. */
export function conversationUnreadCount(dto: ConversationDto): number | null {
  const value = dto.unreadCount
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  return null
}

export function useMessagingInbox(
  restaurantId: string | null,
  limit = 50,
  enabled = true,
) {
  return useQuery({
    queryKey: messagingKeys.inbox(restaurantId ?? ''),
    queryFn: ({ signal }) =>
      listRestaurantConversations(restaurantId!, { limit }, signal),
    enabled: enabled && Boolean(restaurantId),
  })
}

export function useConversationDetail(
  conversationId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: messagingKeys.conversation(conversationId ?? ''),
    queryFn: ({ signal }) => getConversation(conversationId!, signal),
    enabled: enabled && Boolean(conversationId),
  })
}

export function useConversationMessages(
  conversationId: string | null,
  limit = 50,
  enabled = true,
) {
  return useQuery({
    queryKey: messagingKeys.messages(conversationId ?? ''),
    queryFn: ({ signal }) =>
      listConversationMessages(conversationId!, { limit }, signal),
    enabled: enabled && Boolean(conversationId),
  })
}
