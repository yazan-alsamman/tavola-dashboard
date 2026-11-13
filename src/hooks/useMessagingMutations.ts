import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  closeConversation,
  markConversationRead,
  sendConversationMessage,
  startConversation,
  type SendMessageRequest,
  type StartConversationRequest,
} from '@/api/messaging'
import {
  isStaffMessageReceived,
  markNotificationRead,
  notificationConversationId,
  type NotificationDto,
} from '@/api/notifications'
import type { PaginatedData } from '@/api/types'
import { messagingKeys, notificationKeys } from '@/lib/queryKeys'

export interface MessagingMutationScope {
  restaurantId: string
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      conversationId: string
      request: SendMessageRequest
      scope: MessagingMutationScope
    }) => sendConversationMessage(input.conversationId, input.request),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.messages(vars.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.conversation(vars.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.inbox(vars.scope.restaurantId),
        }),
      ])
    },
  })
}

export function useMarkConversationReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      conversationId: string
      scope: MessagingMutationScope
    }) => markConversationRead(input.conversationId),
    onSuccess: async (_data, vars) => {
      // Reading a conversation also clears its "new message" notifications
      // the shell watch has seen, so the badge does not keep counting them.
      const watched =
        queryClient.getQueryData<PaginatedData<NotificationDto>>(notificationKeys.watch())
          ?.items ?? []
      const handled = watched.filter(
        (item) =>
          isStaffMessageReceived(item) &&
          notificationConversationId(item) === vars.conversationId,
      )
      if (handled.length > 0) {
        await Promise.allSettled(handled.map((item) => markNotificationRead(item.id)))
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.conversation(vars.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.inbox(vars.scope.restaurantId),
        }),
      ])
    },
  })
}

export function useCloseConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      conversationId: string
      scope: MessagingMutationScope
    }) => closeConversation(input.conversationId),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: messagingKeys.conversation(vars.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: messagingKeys.inbox(vars.scope.restaurantId),
        }),
      ])
    },
  })
}

export function useStartConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      body: StartConversationRequest
      scope: MessagingMutationScope
    }) => startConversation(input.body),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({
        queryKey: messagingKeys.inbox(vars.scope.restaurantId),
      })
    },
  })
}
