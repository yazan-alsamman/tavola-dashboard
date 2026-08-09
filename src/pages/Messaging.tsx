import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { MaterialIcon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useCloseConversationMutation,
  useMarkConversationReadMutation,
  useSendMessageMutation,
  useStartConversationMutation,
} from '@/hooks/useMessagingMutations'
import {
  conversationUnreadCount,
  useConversationDetail,
  useConversationMessages,
  useMessagingInbox,
} from '@/hooks/useMessagingQueries'
import {
  messageAttachment,
  type ConversationDto,
  type MessageDto,
} from '@/api/messaging'
import { isApiError } from '@/api/errors'
import { formatInstantInTimeZone } from '@/lib/branchDateTime'
import { cn } from '@/lib/utils'

function isConversationClosed(conversation: ConversationDto): boolean {
  const status = conversation.status
  return typeof status === 'string' && status.toLowerCase() === 'closed'
}

function conversationTitle(
  conversation: ConversationDto,
  fallback: string,
): string {
  if (conversation.subject && conversation.subject.trim()) {
    return conversation.subject.trim()
  }
  return fallback
}

function formatMessageTime(iso: string | undefined, locale: string): string {
  if (!iso) return ''
  return formatInstantInTimeZone(iso, 'UTC', locale === 'ar' ? 'ar' : 'en')
}

export function MessagingPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const {
    selectedRestaurantId,
    selectedBranchId,
    branches,
    status: scopeStatus,
  } = useRestaurantScope()

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [messageBody, setMessageBody] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [startSubject, setStartSubject] = useState('')
  const [startBranchId, setStartBranchId] = useState('')
  const [startReservationId, setStartReservationId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inboxQuery = useMessagingInbox(
    selectedRestaurantId,
    50,
    scopeStatus === 'ready',
  )
  const detailQuery = useConversationDetail(selectedConversationId)
  const messagesQuery = useConversationMessages(selectedConversationId)

  const markRead = useMarkConversationReadMutation()
  const closeConversation = useCloseConversationMutation()
  const sendMessage = useSendMessageMutation()
  const startConversation = useStartConversationMutation()

  const conversations = inboxQuery.data?.items ?? []
  const messages = messagesQuery.data?.items ?? []
  const selectedConversation = detailQuery.data ?? null
  const isClosed = selectedConversation
    ? isConversationClosed(selectedConversation)
    : false

  const mutationScope =
    selectedRestaurantId != null
      ? { restaurantId: selectedRestaurantId }
      : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, selectedConversationId])

  useEffect(() => {
    if (selectedBranchId) setStartBranchId(selectedBranchId)
    else if (branches[0]) setStartBranchId(branches[0].branchId)
  }, [selectedBranchId, branches])

  const handleSelectConversation = (conversationId: string): void => {
    setSelectedConversationId(conversationId)
    setMessageBody('')
    setAttachment(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (mutationScope) {
      markRead.mutate({ conversationId, scope: mutationScope })
    }
  }

  const handleSend = (): void => {
    const body = messageBody.trim()
    if (!selectedConversationId || !mutationScope || !body) return

    sendMessage.mutate(
      {
        conversationId: selectedConversationId,
        request: { body, attachment },
        scope: mutationScope,
      },
      {
        onSuccess: () => {
          setMessageBody('')
          setAttachment(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
        onError: () => {
          toast('error', t.messaging.sendError)
        },
      },
    )
  }

  const handleClose = (): void => {
    if (!selectedConversationId || !mutationScope) return

    closeConversation.mutate(
      { conversationId: selectedConversationId, scope: mutationScope },
      {
        onSuccess: () => {
          toast('success', t.messaging.closeSuccess)
        },
        onError: () => {
          toast('error', t.messaging.closeError)
        },
      },
    )
  }

  const handleStart = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedRestaurantId || !mutationScope || !startSubject.trim() || !startBranchId) {
      return
    }
    try {
      const conversation = await startConversation.mutateAsync({
        scope: mutationScope,
        body: {
          restaurantId: selectedRestaurantId,
          branchId: startBranchId,
          subject: startSubject.trim(),
          reservationId: startReservationId.trim() || null,
        },
      })
      toast('success', t.messaging.startSuccess)
      setStartOpen(false)
      setStartSubject('')
      setStartReservationId('')
      const id = conversation.conversationId
      if (id) handleSelectConversation(id)
    } catch (err) {
      toast(
        'error',
        isApiError(err) ? err.message : t.messaging.startError,
      )
    }
  }

  const handleAttachmentChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0] ?? null
    setAttachment(file)
  }

  if (scopeStatus !== 'ready' || !selectedRestaurantId) {
    return (
      <div>
        <PageHeader title={t.messaging.title} subtitle={t.messaging.subtitle} />
        <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t.messaging.title}
        subtitle={t.messaging.subtitle}
        actions={
          <Button onClick={() => setStartOpen(true)}>
            <MaterialIcon name="add" size={18} className="me-1" />
            {t.messaging.startConversation}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr] gap-4 min-h-[calc(100vh-12rem)]">
        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/30">
            <p className="text-label-md font-semibold text-on-surface">
              {t.messaging.inbox}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {inboxQuery.isLoading && (
              <p className="p-4 text-sm text-on-surface-variant">
                {t.common.loading}
              </p>
            )}

            {inboxQuery.isError && (
              <div className="p-4">
                <EmptyState icon="error" title={t.messaging.inboxError} />
              </div>
            )}

            {!inboxQuery.isLoading &&
              !inboxQuery.isError &&
              conversations.length === 0 && (
                <div className="p-4">
                  <EmptyState icon="inbox" title={t.messaging.inboxEmpty} />
                </div>
              )}

            {conversations.map((conversation) => {
              const unread = conversationUnreadCount(conversation)
              const isActive =
                conversation.conversationId === selectedConversationId
              return (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() =>
                    handleSelectConversation(conversation.conversationId)
                  }
                  className={cn(
                    'w-full text-start px-4 py-3 border-b border-outline-variant/20 transition-colors',
                    isActive
                      ? 'bg-primary-container/20 border-s-4 border-s-primary'
                      : 'hover:bg-surface-container-high border-s-4 border-s-transparent',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {conversationTitle(
                        conversation,
                        t.messaging.untitledConversation,
                      )}
                    </p>
                    {unread != null && (
                      <span className="bg-error text-on-error text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shrink-0">
                        <Num>{unread}</Num>
                      </span>
                    )}
                  </div>
                  {conversation.updatedAt && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {formatMessageTime(conversation.updatedAt, locale)}
                    </p>
                  )}
                  {isConversationClosed(conversation) && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {t.messaging.closed}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        <Card padding="none" className="flex flex-col overflow-hidden">
          {!selectedConversationId ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon="forum"
                title={t.messaging.selectConversation}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-outline-variant/30">
                <div className="min-w-0">
                  {detailQuery.isLoading && (
                    <p className="text-sm text-on-surface-variant">
                      {t.common.loading}
                    </p>
                  )}
                  {detailQuery.isError && (
                    <p className="text-sm text-error">
                      {t.messaging.detailError}
                    </p>
                  )}
                  {selectedConversation && (
                    <>
                      <p className="text-label-md font-semibold text-on-surface truncate">
                        {conversationTitle(
                          selectedConversation,
                          t.messaging.untitledConversation,
                        )}
                      </p>
                      {selectedConversation.reservationId && (
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                          {t.messaging.reservation}:{' '}
                          {selectedConversation.reservationId}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {selectedConversation && !isClosed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={closeConversation.isPending}
                  >
                    {t.messaging.closeConversation}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesQuery.isLoading && (
                  <p className="text-sm text-on-surface-variant">
                    {t.common.loading}
                  </p>
                )}

                {messagesQuery.isError && (
                  <EmptyState icon="error" title={t.messaging.messagesError} />
                )}

                {!messagesQuery.isLoading &&
                  !messagesQuery.isError &&
                  messages.length === 0 && (
                    <EmptyState icon="chat" title={t.messaging.messagesEmpty} />
                  )}

                {messages.map((message: MessageDto) => {
                  const file = messageAttachment(message)
                  return (
                    <div
                      key={message.messageId}
                      className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2"
                    >
                      {message.body && (
                        <p className="text-sm text-on-surface whitespace-pre-wrap">
                          {message.body}
                        </p>
                      )}
                      {(file.url || file.name) && (
                        <div className="mt-2">
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <MaterialIcon name="attach_file" size={16} />
                              {file.name || t.messaging.attachment}
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
                              <MaterialIcon name="attach_file" size={16} />
                              {file.name}
                            </span>
                          )}
                        </div>
                      )}
                      {message.createdAt && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          {formatMessageTime(message.createdAt, locale)}
                        </p>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-outline-variant/30 p-4 space-y-3">
                {isClosed ? (
                  <p className="text-sm text-on-surface-variant">
                    {t.messaging.closedHint}
                  </p>
                ) : (
                  <>
                    <textarea
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder={t.messaging.messagePlaceholder}
                      rows={3}
                      className={cn(
                        'w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
                        'text-on-surface text-body-md px-4 py-2 resize-none',
                        'placeholder:text-outline/50 transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleAttachmentChange}
                        aria-label={t.messaging.attachFile}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <MaterialIcon name="attach_file" size={16} />
                        {t.messaging.attachFile}
                      </Button>
                      {attachment && (
                        <span className="text-xs text-on-surface-variant truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="ms-auto"
                        onClick={handleSend}
                        disabled={
                          !messageBody.trim() || sendMessage.isPending
                        }
                      >
                        {sendMessage.isPending
                          ? t.messaging.sending
                          : t.messaging.send}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={startOpen}
        onClose={() => !startConversation.isPending && setStartOpen(false)}
        title={t.messaging.startConversation}
        description={t.messaging.startSubtitle}
      >
        <form className="space-y-4" onSubmit={(e) => void handleStart(e)}>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
              {t.messaging.subject}
            </label>
            <Input
              value={startSubject}
              onChange={(e) => setStartSubject(e.target.value)}
              required
              disabled={startConversation.isPending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
              {t.messaging.branch}
            </label>
            <select
              className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2.5 text-sm"
              value={startBranchId}
              onChange={(e) => setStartBranchId(e.target.value)}
              required
              disabled={startConversation.isPending}
            >
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.city}
                  {branch.district ? ` — ${branch.district}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
              {t.messaging.reservationOptional}
            </label>
            <Input
              value={startReservationId}
              onChange={(e) => setStartReservationId(e.target.value)}
              disabled={startConversation.isPending}
              placeholder={t.messaging.reservationIdPlaceholder}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStartOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={startConversation.isPending}>
              {startConversation.isPending
                ? t.common.loading
                : t.messaging.startConversation}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
