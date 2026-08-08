import { apiRequest } from './client'
import type { PaginatedData } from './types'

export interface ConversationDto {
  conversationId: string
  restaurantId?: string
  branchId?: string
  reservationId?: string | null
  subject?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface MessageDto {
  messageId: string
  conversationId?: string
  body?: string | null
  senderId?: string
  createdAt?: string
  [key: string]: unknown
}

/** Cursor-paginated list payload (messaging staff inbox / messages). */
export interface CursorPaginatedData<T> {
  items: T[]
  nextCursor?: string | null
  hasMore?: boolean
  [key: string]: unknown
}

export interface ListRestaurantConversationsParams {
  limit?: number
  cursor?: string | null
}

export interface ListConversationsParams {
  page?: number
  pageSize?: number
}

export interface ListConversationMessagesParams {
  limit?: number
  cursor?: string | null
}

export interface StartConversationRequest {
  restaurantId: string
  branchId: string
  reservationId?: string | null
  subject: string
}

export interface SendMessageRequest {
  body: string
  attachment?: File | null
}

export async function listRestaurantConversations(
  restaurantId: string,
  params: ListRestaurantConversationsParams = {},
  signal?: AbortSignal,
): Promise<CursorPaginatedData<ConversationDto>> {
  return apiRequest<CursorPaginatedData<ConversationDto>>(
    `/restaurants/${restaurantId}/conversations`,
    {
      query: {
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
      signal,
    },
  )
}

export async function listConversations(
  params: ListConversationsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<ConversationDto>> {
  return apiRequest<PaginatedData<ConversationDto>>('/conversations', {
    query: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function getConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationDto> {
  return apiRequest<ConversationDto>(`/conversations/${conversationId}`, {
    signal,
  })
}

export async function listConversationMessages(
  conversationId: string,
  params: ListConversationMessagesParams = {},
  signal?: AbortSignal,
): Promise<CursorPaginatedData<MessageDto>> {
  return apiRequest<CursorPaginatedData<MessageDto>>(
    `/conversations/${conversationId}/messages`,
    {
      query: {
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
      signal,
    },
  )
}

export async function startConversation(
  body: StartConversationRequest,
): Promise<ConversationDto> {
  return apiRequest<ConversationDto>('/conversations', {
    method: 'POST',
    body: {
      restaurantId: body.restaurantId,
      branchId: body.branchId,
      subject: body.subject,
      ...(body.reservationId != null ? { reservationId: body.reservationId } : {}),
    },
  })
}

export async function sendConversationMessage(
  conversationId: string,
  request: SendMessageRequest,
): Promise<MessageDto> {
  const form = new FormData()
  form.append('body', request.body)
  if (request.attachment) {
    form.append('attachment', request.attachment)
  }
  return apiRequest<MessageDto>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: form,
  })
}

export async function markConversationRead(
  conversationId: string,
): Promise<ConversationDto> {
  return apiRequest<ConversationDto>(`/conversations/${conversationId}/read`, {
    method: 'POST',
  })
}

export async function closeConversation(
  conversationId: string,
): Promise<ConversationDto> {
  return apiRequest<ConversationDto>(`/conversations/${conversationId}/close`, {
    method: 'POST',
  })
}
