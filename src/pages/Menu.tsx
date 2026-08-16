import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isApiError } from '@/api/errors'
import type {
  MenuCategoryDto,
  MenuDto,
  MenuItemAddOnDto,
  MenuItemDto,
  MenuItemOptionDto,
  MenuItemOptionGroupDto,
} from '@/api/menus'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useActivateMenuMutation,
  useCreateMenuCategoryMutation,
  useCreateMenuItemAddOnMutation,
  useCreateMenuItemMutation,
  useCreateMenuItemOptionGroupMutation,
  useCreateMenuItemOptionMutation,
  useCreateMenuMutation,
  useDeactivateMenuMutation,
  useDeleteMenuCategoryMutation,
  useDeleteMenuItemAddOnMutation,
  useDeleteMenuItemMutation,
  useDeleteMenuItemOptionGroupMutation,
  useDeleteMenuItemOptionMutation,
  useDeleteMenuMutation,
  useFeatureMenuItemMutation,
  useReorderMenuCategoriesMutation,
  useReorderMenuItemsMutation,
  useRemoveMenuCategoryImageMutation,
  useRemoveMenuItemImageMutation,
  useSetDefaultMenuMutation,
  useUnfeatureMenuItemMutation,
  useUploadMenuCategoryImageMutation,
  useUploadMenuItemImageMutation,
  useUpdateMenuItemAddOnMutation,
  useUpdateMenuItemMutation,
  useUpdateMenuItemOptionGroupMutation,
  useUpdateMenuItemOptionMutation,
  useUpdateMenuMutation,
  useUpdateMenuCategoryMutation,
  useReplaceMenuItemAvailabilityMutation,
} from '@/hooks/useMenuMutations'
import { useSelectedMenu } from '@/hooks/useMenuQueries'
import { useCanManageMenu } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

function sortByDisplayOrder<T extends { displayOrder?: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  )
}

function mapMenuError(err: unknown, t: ReturnType<typeof useLocale>['t']): string {
  if (isApiError(err)) return err.message
  return t.menu.errors.unknown
}

function menuStatusLabel(
  menu: MenuDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (menu.status === 'Active') return t.menu.status.active
  if (menu.status === 'Inactive') return t.menu.status.inactive
  return menu.status ?? t.common.status
}

function menuStatusStyle(status: string | undefined): string {
  if (status === 'Active') return 'bg-success/10 text-success'
  if (status === 'Inactive') return 'bg-surface-variant text-on-surface-variant'
  return 'bg-surface-variant text-on-surface-variant'
}

interface ItemEditModalProps {
  open: boolean
  item: MenuItemDto | null
  restaurantId: string
  menuId: string
  categoryId: string
  canManage: boolean
  onClose: () => void
}

function ItemEditModal({
  open,
  item,
  restaurantId,
  menuId,
  categoryId,
  canManage,
  onClose,
}: ItemEditModalProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const updateItem = useUpdateMenuItemMutation()
  const uploadItemImage = useUploadMenuItemImageMutation()
  const removeItemImage = useRemoveMenuItemImageMutation()
  const featureItem = useFeatureMenuItemMutation()
  const unfeatureItem = useUnfeatureMenuItemMutation()
  const createOptionGroup = useCreateMenuItemOptionGroupMutation()
  const deleteOptionGroup = useDeleteMenuItemOptionGroupMutation()
  const createOption = useCreateMenuItemOptionMutation()
  const updateOption = useUpdateMenuItemOptionMutation()
  const deleteOption = useDeleteMenuItemOptionMutation()
  const createAddOn = useCreateMenuItemAddOnMutation()
  const updateAddOn = useUpdateMenuItemAddOnMutation()
  const deleteAddOn = useDeleteMenuItemAddOnMutation()
  const updateOptionGroup = useUpdateMenuItemOptionGroupMutation()
  const replaceAvailability = useReplaceMenuItemAvailabilityMutation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newAddOnName, setNewAddOnName] = useState('')
  const [newAddOnPrice, setNewAddOnPrice] = useState('')
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionPrice, setNewOptionPrice] = useState('')
  const [editGroupId, setEditGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupRequired, setEditGroupRequired] = useState(false)
  const [editGroupMin, setEditGroupMin] = useState('0')
  const [editGroupMax, setEditGroupMax] = useState('1')
  const [windows, setWindows] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  >([])
  const itemImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!item) return
    setName(item.name)
    setDescription(item.description ?? '')
    setPrice(String(item.price ?? ''))
    setExpandedGroupId(null)
    setNewGroupName('')
    setNewAddOnName('')
    setNewAddOnPrice('')
    setNewOptionName('')
    setNewOptionPrice('')
    setEditGroupId(null)
    setWindows(
      (item.availabilityWindows ?? []).map((w) => ({
        dayOfWeek: Number(w.dayOfWeek ?? 0),
        startTime: String(w.startTime ?? '09:00'),
        endTime: String(w.endTime ?? '22:00'),
      })),
    )
  }, [item])

  if (!item) return null

  const itemScope = {
    restaurantId,
    menuId,
    categoryId,
    itemId: item.itemId,
  }

  const busy =
    updateItem.isPending ||
    uploadItemImage.isPending ||
    removeItemImage.isPending ||
    featureItem.isPending ||
    unfeatureItem.isPending ||
    createOptionGroup.isPending ||
    deleteOptionGroup.isPending ||
    createOption.isPending ||
    updateOption.isPending ||
    deleteOption.isPending ||
    createAddOn.isPending ||
    updateAddOn.isPending ||
    deleteAddOn.isPending ||
    updateOptionGroup.isPending ||
    replaceAvailability.isPending

  const handleSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!canManage || busy) return
    const parsedPrice = Number(price)
    if (!name.trim() || Number.isNaN(parsedPrice)) return

    try {
      await updateItem.mutateAsync({
        ...itemScope,
        body: {
          name: name.trim(),
          description: description.trim() || null,
          price: parsedPrice,
        },
      })
      toast('success', t.menu.items.saveSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const toggleFeatured = async (): Promise<void> => {
    if (!canManage || busy) return
    try {
      if (item.isFeatured) {
        await unfeatureItem.mutateAsync(itemScope)
        toast('success', t.menu.items.unfeatureSuccess)
      } else {
        await featureItem.mutateAsync(itemScope)
        toast('success', t.menu.items.featureSuccess)
      }
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const handleCreateGroup = async (): Promise<void> => {
    if (!canManage || !newGroupName.trim() || busy) return
    try {
      await createOptionGroup.mutateAsync({
        ...itemScope,
        body: { name: newGroupName.trim() },
      })
      setNewGroupName('')
      toast('success', t.menu.optionGroups.createSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const handleCreateAddOn = async (): Promise<void> => {
    if (!canManage || !newAddOnName.trim() || busy) return
    const parsedPrice = Number(newAddOnPrice)
    if (Number.isNaN(parsedPrice)) return
    try {
      await createAddOn.mutateAsync({
        ...itemScope,
        body: { name: newAddOnName.trim(), price: parsedPrice },
      })
      setNewAddOnName('')
      setNewAddOnPrice('')
      toast('success', t.menu.addOns.createSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const handleCreateOption = async (optionGroupId: string): Promise<void> => {
    if (!canManage || !newOptionName.trim() || busy) return
    const priceModifier = Number(newOptionPrice || '0')
    if (Number.isNaN(priceModifier)) return
    try {
      await createOption.mutateAsync({
        ...itemScope,
        optionGroupId,
        body: {
          name: newOptionName.trim(),
          priceModifier,
        },
      })
      setNewOptionName('')
      setNewOptionPrice('')
      toast('success', t.menu.options.createSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const startEditGroup = (group: MenuItemOptionGroupDto) => {
    setEditGroupId(group.optionGroupId)
    setEditGroupName(group.name)
    setEditGroupRequired(Boolean(group.required))
    setEditGroupMin(String(group.minSelections ?? 0))
    setEditGroupMax(String(group.maxSelections ?? 1))
  }

  const handleSaveGroup = async (): Promise<void> => {
    if (!canManage || !editGroupId || !editGroupName.trim() || busy) return
    try {
      await updateOptionGroup.mutateAsync({
        ...itemScope,
        optionGroupId: editGroupId,
        body: {
          name: editGroupName.trim(),
          required: editGroupRequired,
          minSelections: Number(editGroupMin) || 0,
          maxSelections: Number(editGroupMax) || 1,
        },
      })
      setEditGroupId(null)
      toast('success', t.menu.optionGroups.updateSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const handleSaveAvailability = async (): Promise<void> => {
    if (!canManage || busy) return
    try {
      await replaceAvailability.mutateAsync({
        ...itemScope,
        body: { windows },
      })
      toast('success', t.menu.availability.saveSuccess)
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const optionGroups = item.optionGroups ?? []
  const addOns = item.addOns ?? []

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={t.menu.items.editTitle}
      description={item.name}
      size="lg"
    >
      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-label-sm text-on-surface-variant mb-1 block">
              {t.menu.items.name}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage || busy}
              required
            />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant mb-1 block">
              {t.menu.items.price}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!canManage || busy}
              required
            />
          </div>
        </div>
        <div>
          <label className="text-label-sm text-on-surface-variant mb-1 block">
            {t.menu.items.description}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canManage || busy}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canManage && (
            <>
              <input
                ref={itemImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  void uploadItemImage
                    .mutateAsync({ ...itemScope, file })
                    .then(() => toast('success', t.menu.items.imageUploadSuccess))
                    .catch((err) => toast('error', mapMenuError(err, t)))
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => itemImageInputRef.current?.click()}
              >
                {t.menu.items.uploadImage}
              </Button>
              {item.imageUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void removeItemImage
                      .mutateAsync(itemScope)
                      .then(() => toast('success', t.menu.items.imageRemoveSuccess))
                      .catch((err) => toast('error', mapMenuError(err, t)))
                  }
                >
                  {t.menu.items.removeImage}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void toggleFeatured()}
              >
                <MaterialIcon
                  name={item.isFeatured ? 'star' : 'star_border'}
                  size={16}
                />
                {item.isFeatured
                  ? t.menu.items.unfeature
                  : t.menu.items.feature}
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {t.common.save}
              </Button>
            </>
          )}
        </div>

        <div className="border-t border-outline-variant/30 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-label-md font-semibold text-on-surface">
              {t.menu.availability.title}
            </h4>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    setWindows((prev) => [
                      ...prev,
                      { dayOfWeek: 0, startTime: '09:00', endTime: '22:00' },
                    ])
                  }
                >
                  {t.menu.availability.addWindow}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleSaveAvailability()}
                >
                  {t.menu.availability.save}
                </Button>
              </div>
            )}
          </div>
          {windows.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              {t.menu.availability.empty}
            </p>
          ) : (
            <div className="space-y-2">
              {windows.map((window, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-2 py-2 text-sm"
                    value={window.dayOfWeek}
                    disabled={!canManage || busy}
                    onChange={(e) => {
                      const next = [...windows]
                      next[index] = {
                        ...window,
                        dayOfWeek: Number(e.target.value),
                      }
                      setWindows(next)
                    }}
                  >
                    {[
                      'Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat',
                    ].map((label, day) => (
                      <option key={day} value={day}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="time"
                    value={window.startTime}
                    className="w-28"
                    disabled={!canManage || busy}
                    onChange={(e) => {
                      const next = [...windows]
                      next[index] = { ...window, startTime: e.target.value }
                      setWindows(next)
                    }}
                  />
                  <Input
                    type="time"
                    value={window.endTime}
                    className="w-28"
                    disabled={!canManage || busy}
                    onChange={(e) => {
                      const next = [...windows]
                      next[index] = { ...window, endTime: e.target.value }
                      setWindows(next)
                    }}
                  />
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        setWindows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      {t.common.delete}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant/30 pt-4 space-y-3">
          <h4 className="text-label-md font-semibold text-on-surface">
            {t.menu.optionGroups.title}
          </h4>
          {optionGroups.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">
              {t.menu.optionGroups.empty}
            </p>
          )}
          {optionGroups.map((group) => (
            <OptionGroupSection
              key={group.optionGroupId}
              group={group}
              expanded={expandedGroupId === group.optionGroupId}
              onToggle={() =>
                setExpandedGroupId((prev) =>
                  prev === group.optionGroupId ? null : group.optionGroupId,
                )
              }
              canManage={canManage}
              busy={busy}
              editing={editGroupId === group.optionGroupId}
              editName={editGroupName}
              editRequired={editGroupRequired}
              editMin={editGroupMin}
              editMax={editGroupMax}
              onEditNameChange={setEditGroupName}
              onEditRequiredChange={setEditGroupRequired}
              onEditMinChange={setEditGroupMin}
              onEditMaxChange={setEditGroupMax}
              onStartEdit={() => startEditGroup(group)}
              onCancelEdit={() => setEditGroupId(null)}
              onSaveEdit={() => void handleSaveGroup()}
              newOptionName={newOptionName}
              newOptionPrice={newOptionPrice}
              onNewOptionNameChange={setNewOptionName}
              onNewOptionPriceChange={setNewOptionPrice}
              onCreateOption={() => void handleCreateOption(group.optionGroupId)}
              onDeleteGroup={async () => {
                try {
                  await deleteOptionGroup.mutateAsync({
                    ...itemScope,
                    optionGroupId: group.optionGroupId,
                  })
                  toast('success', t.menu.optionGroups.deleteSuccess)
                } catch (err) {
                  toast('error', mapMenuError(err, t))
                }
              }}
              onToggleOption={async (option: MenuItemOptionDto) => {
                try {
                  await updateOption.mutateAsync({
                    ...itemScope,
                    optionGroupId: group.optionGroupId,
                    optionId: option.optionId,
                    body: { active: !option.active },
                  })
                } catch (err) {
                  toast('error', mapMenuError(err, t))
                }
              }}
              onDeleteOption={async (optionId: string) => {
                try {
                  await deleteOption.mutateAsync({
                    ...itemScope,
                    optionGroupId: group.optionGroupId,
                    optionId,
                  })
                  toast('success', t.menu.options.deleteSuccess)
                } catch (err) {
                  toast('error', mapMenuError(err, t))
                }
              }}
              t={t}
            />
          ))}
          {canManage && (
            <div className="flex gap-2">
              <Input
                placeholder={t.menu.optionGroups.namePlaceholder}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                disabled={busy}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !newGroupName.trim()}
                onClick={() => void handleCreateGroup()}
              >
                {t.common.add}
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant/30 pt-4 space-y-3">
          <h4 className="text-label-md font-semibold text-on-surface">
            {t.menu.addOns.title}
          </h4>
          {addOns.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">
              {t.menu.addOns.empty}
            </p>
          )}
          <ul className="space-y-2">
            {addOns.map((addOn) => (
              <AddOnRow
                key={addOn.addOnId}
                addOn={addOn}
                canManage={canManage}
                busy={busy}
                onToggle={async () => {
                  try {
                    await updateAddOn.mutateAsync({
                      ...itemScope,
                      addOnId: addOn.addOnId,
                      body: { active: !addOn.active },
                    })
                  } catch (err) {
                    toast('error', mapMenuError(err, t))
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteAddOn.mutateAsync({
                      ...itemScope,
                      addOnId: addOn.addOnId,
                    })
                    toast('success', t.menu.addOns.deleteSuccess)
                  } catch (err) {
                    toast('error', mapMenuError(err, t))
                  }
                }}
                t={t}
              />
            ))}
          </ul>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder={t.menu.addOns.namePlaceholder}
                value={newAddOnName}
                onChange={(e) => setNewAddOnName(e.target.value)}
                disabled={busy}
                className="flex-1 min-w-[140px]"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t.menu.addOns.pricePlaceholder}
                value={newAddOnPrice}
                onChange={(e) => setNewAddOnPrice(e.target.value)}
                disabled={busy}
                className="w-28"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !newAddOnName.trim()}
                onClick={() => void handleCreateAddOn()}
              >
                {t.common.add}
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

function OptionGroupSection({
  group,
  expanded,
  onToggle,
  canManage,
  busy,
  editing,
  editName,
  editRequired,
  editMin,
  editMax,
  onEditNameChange,
  onEditRequiredChange,
  onEditMinChange,
  onEditMaxChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  newOptionName,
  newOptionPrice,
  onNewOptionNameChange,
  onNewOptionPriceChange,
  onCreateOption,
  onDeleteGroup,
  onToggleOption,
  onDeleteOption,
  t,
}: {
  group: MenuItemOptionGroupDto
  expanded: boolean
  onToggle: () => void
  canManage: boolean
  busy: boolean
  editing: boolean
  editName: string
  editRequired: boolean
  editMin: string
  editMax: string
  onEditNameChange: (v: string) => void
  onEditRequiredChange: (v: boolean) => void
  onEditMinChange: (v: string) => void
  onEditMaxChange: (v: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  newOptionName: string
  newOptionPrice: string
  onNewOptionNameChange: (v: string) => void
  onNewOptionPriceChange: (v: string) => void
  onCreateOption: () => void
  onDeleteGroup: () => void
  onToggleOption: (option: MenuItemOptionDto) => void
  onDeleteOption: (optionId: string) => void
  t: ReturnType<typeof useLocale>['t']
}) {
  const options = group.options ?? []

  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
        onClick={onToggle}
      >
        <span className="text-body-md font-medium text-on-surface">
          {group.name}
          {group.required && (
            <span className="ms-2 text-label-sm text-on-surface-variant">
              ({t.menu.optionGroups.required})
            </span>
          )}
        </span>
        <MaterialIcon
          name={expanded ? 'expand_less' : 'expand_more'}
          size={20}
          className="text-on-surface-variant"
        />
      </button>
      {expanded && (
        <div className="border-t border-outline-variant/20 px-3 py-2 space-y-2">
          {canManage && (
            <div className="pb-2">
              {editing ? (
                <div className="space-y-2 rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/20">
                  <Input
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    disabled={busy}
                    placeholder={t.menu.optionGroups.namePlaceholder}
                  />
                  <label className="flex items-center gap-2 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={editRequired}
                      disabled={busy}
                      onChange={(e) => onEditRequiredChange(e.target.checked)}
                    />
                    {t.menu.optionGroups.required}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={editMin}
                      disabled={busy}
                      onChange={(e) => onEditMinChange(e.target.value)}
                      placeholder={t.menu.optionGroups.minSelections}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={editMax}
                      disabled={busy}
                      onChange={(e) => onEditMaxChange(e.target.value)}
                      placeholder={t.menu.optionGroups.maxSelections}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !editName.trim()}
                      onClick={onSaveEdit}
                    >
                      {t.common.save}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={onCancelEdit}
                    >
                      {t.common.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={onStartEdit}
                >
                  {t.menu.optionGroups.edit}
                </Button>
              )}
            </div>
          )}
          {options.map((option) => (
            <div
              key={option.optionId}
              className="flex items-center justify-between gap-2 text-body-sm"
            >
              <span className={cn(!option.active && 'opacity-50 line-through')}>
                {option.name}
                {option.priceModifier ? (
                  <span className="text-on-surface-variant ms-1">
                    (+<Num>{option.priceModifier}</Num>)
                  </span>
                ) : null}
              </span>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void onToggleOption(option)}
                  >
                    {option.active ? t.menu.options.deactivate : t.menu.options.activate}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void onDeleteOption(option.optionId)}
                  >
                    {t.common.delete}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {canManage && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Input
                placeholder={t.menu.options.namePlaceholder}
                value={newOptionName}
                onChange={(e) => onNewOptionNameChange(e.target.value)}
                disabled={busy}
                className="flex-1 min-w-[120px]"
              />
              <Input
                type="number"
                step="0.01"
                placeholder={t.menu.options.pricePlaceholder}
                value={newOptionPrice}
                onChange={(e) => onNewOptionPriceChange(e.target.value)}
                disabled={busy}
                className="w-24"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || !newOptionName.trim()}
                onClick={onCreateOption}
              >
                {t.common.add}
              </Button>
            </div>
          )}
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => void onDeleteGroup()}
            >
              {t.menu.optionGroups.delete}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function AddOnRow({
  addOn,
  canManage,
  busy,
  onToggle,
  onDelete,
  t,
}: {
  addOn: MenuItemAddOnDto
  canManage: boolean
  busy: boolean
  onToggle: () => void
  onDelete: () => void
  t: ReturnType<typeof useLocale>['t']
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-body-sm">
      <span className={cn(!addOn.active && 'opacity-50 line-through')}>
        {addOn.name}
        <span className="text-on-surface-variant ms-1">
          (<Num>{addOn.price ?? 0}</Num>)
        </span>
      </span>
      {canManage && (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onToggle()}
          >
            {addOn.active ? t.menu.addOns.deactivate : t.menu.addOns.activate}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            {t.common.delete}
          </Button>
        </div>
      )}
    </li>
  )
}

export function MenuPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const {
    status: scopeStatus,
    selectedRestaurantId,
    selectedRestaurant,
  } = useRestaurantScope()
  const canManage = useCanManageMenu()
  const {
    menusQuery,
    menuDetailQuery,
    selectedMenuId,
    selectedMenu,
    selectMenu,
  } = useSelectedMenu()

  const createMenu = useCreateMenuMutation()
  const updateMenu = useUpdateMenuMutation()
  const activateMenu = useActivateMenuMutation()
  const deactivateMenu = useDeactivateMenuMutation()
  const setDefaultMenu = useSetDefaultMenuMutation()
  const deleteMenu = useDeleteMenuMutation()
  const createCategory = useCreateMenuCategoryMutation()
  const updateCategory = useUpdateMenuCategoryMutation()
  const reorderCategories = useReorderMenuCategoriesMutation()
  const deleteCategory = useDeleteMenuCategoryMutation()
  const uploadCategoryImage = useUploadMenuCategoryImageMutation()
  const removeCategoryImage = useRemoveMenuCategoryImageMutation()
  const createItem = useCreateMenuItemMutation()
  const reorderItems = useReorderMenuItemsMutation()
  const deleteItem = useDeleteMenuItemMutation()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [editItem, setEditItem] = useState<MenuItemDto | null>(null)
  const [deleteMenuTarget, setDeleteMenuTarget] = useState<MenuDto | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<MenuCategoryDto | null>(null)
  const [editCategoryTarget, setEditCategoryTarget] =
    useState<MenuCategoryDto | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategoryDescription, setEditCategoryDescription] = useState('')
  const [deleteItemTarget, setDeleteItemTarget] = useState<MenuItemDto | null>(
    null,
  )
  const categoryImageInputRef = useRef<HTMLInputElement>(null)
  const [renameMenuTarget, setRenameMenuTarget] = useState<MenuDto | null>(null)
  const [renameMenuName, setRenameMenuName] = useState('')

  const restaurantId = selectedRestaurantId ?? ''
  const menuId = selectedMenuId ?? ''

  const categories = useMemo(
    () => sortByDisplayOrder(selectedMenu?.categories ?? []),
    [selectedMenu?.categories],
  )

  const resolvedCategoryId = useMemo(() => {
    if (!categories.length) return null
    if (
      selectedCategoryId &&
      categories.some((c) => c.categoryId === selectedCategoryId)
    ) {
      return selectedCategoryId
    }
    return categories[0]?.categoryId ?? null
  }, [categories, selectedCategoryId])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.categoryId === resolvedCategoryId) ?? null,
    [categories, resolvedCategoryId],
  )

  const items = useMemo(
    () => sortByDisplayOrder(selectedCategory?.items ?? []),
    [selectedCategory?.items],
  )

  const menuScope = { restaurantId, menuId }
  const categoryScope =
    resolvedCategoryId != null
      ? { restaurantId, menuId, categoryId: resolvedCategoryId }
      : null

  const anyMutationPending =
    createMenu.isPending ||
    updateMenu.isPending ||
    activateMenu.isPending ||
    deactivateMenu.isPending ||
    setDefaultMenu.isPending ||
    deleteMenu.isPending ||
    createCategory.isPending ||
    updateCategory.isPending ||
    reorderCategories.isPending ||
    deleteCategory.isPending ||
    uploadCategoryImage.isPending ||
    removeCategoryImage.isPending ||
    createItem.isPending ||
    reorderItems.isPending ||
    deleteItem.isPending

  const moveCategory = async (categoryId: string, direction: -1 | 1): Promise<void> => {
    if (!canManage || !menuId) return
    const index = categories.findIndex((c) => c.categoryId === categoryId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= categories.length) return
    const ordered = [...categories]
    const [removed] = ordered.splice(index, 1)
    ordered.splice(target, 0, removed)
    try {
      await reorderCategories.mutateAsync({
        restaurantId,
        menuId,
        body: { orderedIds: ordered.map((c) => c.categoryId) },
      })
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  const moveItem = async (itemId: string, direction: -1 | 1): Promise<void> => {
    if (!canManage || !categoryScope) return
    const index = items.findIndex((i) => i.itemId === itemId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= items.length) return
    const ordered = [...items]
    const [removed] = ordered.splice(index, 1)
    ordered.splice(target, 0, removed)
    try {
      await reorderItems.mutateAsync({
        ...categoryScope,
        body: { orderedIds: ordered.map((i) => i.itemId) },
      })
    } catch (err) {
      toast('error', mapMenuError(err, t))
    }
  }

  if (scopeStatus !== 'ready' || !selectedRestaurantId) {
    return (
      <div>
        <PageHeader title={t.menu.title} subtitle={t.menu.subtitle} />
        <EmptyState
          icon="restaurant_menu"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      </div>
    )
  }

  if (menusQuery.isLoading || (selectedMenuId && menuDetailQuery.isLoading)) {
    return (
      <div>
        <PageHeader title={t.menu.title} subtitle={t.menu.subtitle} />
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.menu.loading}
        </p>
      </div>
    )
  }

  if (menusQuery.isError) {
    const forbidden = isApiError(menusQuery.error) && menusQuery.error.code === 'FORBIDDEN'
    return (
      <div>
        <PageHeader title={t.menu.title} subtitle={t.menu.subtitle} />
        <EmptyState
          icon="error"
          title={forbidden ? t.menu.forbiddenTitle : t.menu.errorTitle}
          description={forbidden ? t.menu.forbiddenBody : t.menu.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void menusQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      </div>
    )
  }

  const menus = menusQuery.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.menu.title}
        subtitle={
          selectedRestaurant
            ? `${t.menu.subtitle} — ${selectedRestaurant.name}`
            : t.menu.subtitle
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/app/gallery"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/50 text-label-md font-medium text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <MaterialIcon name="photo_library" size={18} />
              {t.menu.openGallery}
            </Link>
            {canManage ? (
              <Button onClick={() => setCreateMenuOpen(true)}>
                <MaterialIcon name="add" size={18} />
                {t.menu.createMenu}
              </Button>
            ) : null}
          </div>
        }
      />

      {!canManage && (
        <p className="text-body-sm text-on-surface-variant rounded-lg bg-surface-container-low px-4 py-3">
          {t.menu.readOnlyHint}
        </p>
      )}

      {menus.length === 0 && (
        <EmptyState
          icon="restaurant_menu"
          title={t.menu.getStartedTitle}
          description={t.menu.getStartedBody}
          action={
            canManage ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => setCreateMenuOpen(true)}>
                  <MaterialIcon name="add" size={18} className="me-1" />
                  {t.menu.createMenu}
                </Button>
                <Link
                  to="/app/gallery"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/50 text-label-md font-medium text-on-surface hover:bg-surface-container-high"
                >
                  <MaterialIcon name="photo_library" size={18} />
                  {t.menu.openGallery}
                </Link>
              </div>
            ) : undefined
          }
        />
      )}

      {menus.length > 0 && (
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Menus */}
        <Card padding="none" className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              <MaterialIcon name="menu_book" size={20} />
              {t.menu.menus.title}
            </CardTitle>
          </CardHeader>
          <div className="px-3 pb-3 space-y-1 max-h-[480px] overflow-y-auto">
            {menus.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant px-2 py-4 text-center">
                {t.menu.menus.empty}
              </p>
            ) : (
              menus.map((menu) => {
                const active = menu.menuId === selectedMenuId
                return (
                  <div
                    key={menu.menuId}
                    className={cn(
                      'rounded-lg border transition-colors',
                      active
                        ? 'border-primary bg-primary-container/10'
                        : 'border-transparent hover:bg-surface-container-high',
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2"
                      onClick={() => {
                        selectMenu(menu.menuId)
                        setSelectedCategoryId(null)
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-md font-medium text-on-surface truncate">
                          {menu.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {menu.isDefault && (
                            <span className="text-[10px] uppercase tracking-wide text-primary font-bold">
                              {t.menu.menus.defaultBadge}
                            </span>
                          )}
                          <StatusBadge
                            status={menu.status ?? ''}
                            label={menuStatusLabel(menu, t)}
                            type="custom"
                            className={menuStatusStyle(menu.status)}
                          />
                        </div>
                      </div>
                    </button>
                    {active && canManage && (
                      <div className="flex flex-wrap gap-1 px-3 pb-2">
                        {menu.status !== 'Active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={anyMutationPending}
                            onClick={() =>
                              void activateMenu
                                .mutateAsync(menuScope)
                                .then(() => toast('success', t.menu.menus.activateSuccess))
                                .catch((err) => toast('error', mapMenuError(err, t)))
                            }
                          >
                            {t.menu.menus.activate}
                          </Button>
                        )}
                        {menu.status === 'Active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={anyMutationPending}
                            onClick={() =>
                              void deactivateMenu
                                .mutateAsync(menuScope)
                                .then(() =>
                                  toast('success', t.menu.menus.deactivateSuccess),
                                )
                                .catch((err) => toast('error', mapMenuError(err, t)))
                            }
                          >
                            {t.menu.menus.deactivate}
                          </Button>
                        )}
                        {!menu.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={anyMutationPending}
                            onClick={() =>
                              void setDefaultMenu
                                .mutateAsync(menuScope)
                                .then(() =>
                                  toast('success', t.menu.menus.setDefaultSuccess),
                                )
                                .catch((err) => toast('error', mapMenuError(err, t)))
                            }
                          >
                            {t.menu.menus.setDefault}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={anyMutationPending}
                          onClick={() => {
                            setRenameMenuTarget(menu)
                            setRenameMenuName(menu.name)
                          }}
                        >
                          {t.common.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={anyMutationPending}
                          onClick={() => setDeleteMenuTarget(menu)}
                        >
                          {t.common.delete}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Categories */}
        <Card padding="none" className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              <MaterialIcon name="category" size={20} />
              {t.menu.categories.title}
            </CardTitle>
            {canManage && selectedMenuId && (
              <Button size="sm" variant="secondary" onClick={() => setCreateCategoryOpen(true)}>
                <MaterialIcon name="add" size={16} />
                {t.common.add}
              </Button>
            )}
          </CardHeader>
          <div className="px-3 pb-3 space-y-1 max-h-[480px] overflow-y-auto">
            {!selectedMenuId ? (
              <p className="text-body-sm text-on-surface-variant px-2 py-4 text-center">
                {t.menu.categories.selectMenu}
              </p>
            ) : categories.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant px-2 py-4 text-center">
                {t.menu.categories.empty}
              </p>
            ) : (
              categories.map((category, index) => {
                const active = category.categoryId === resolvedCategoryId
                return (
                  <div
                    key={category.categoryId}
                    className={cn(
                      'rounded-lg border transition-colors',
                      active
                        ? 'border-primary bg-primary-container/10'
                        : 'border-transparent hover:bg-surface-container-high',
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2"
                      onClick={() => setSelectedCategoryId(category.categoryId)}
                    >
                      <div className="flex items-center gap-3">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover border border-outline-variant/30 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-center shrink-0 text-on-surface-variant">
                            <MaterialIcon name="image" size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-body-md font-medium text-on-surface block truncate">
                            {category.name}
                          </span>
                          {category.description && (
                            <p className="text-body-sm text-on-surface-variant truncate">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    {active && canManage && (
                      <div className="flex flex-wrap gap-1 px-3 pb-2">
                        <input
                          ref={active ? categoryImageInputRef : undefined}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={anyMutationPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (!file || !menuId) return
                            void uploadCategoryImage
                              .mutateAsync({
                                restaurantId,
                                menuId,
                                categoryId: category.categoryId,
                                file,
                              })
                              .then(() =>
                                toast('success', t.menu.categories.imageUploadSuccess),
                              )
                              .catch((err) => toast('error', mapMenuError(err, t)))
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={anyMutationPending}
                          onClick={() => categoryImageInputRef.current?.click()}
                        >
                          {t.menu.categories.uploadImage}
                        </Button>
                        {category.imageUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={anyMutationPending}
                            onClick={() =>
                              void removeCategoryImage
                                .mutateAsync({
                                  restaurantId,
                                  menuId,
                                  categoryId: category.categoryId,
                                })
                                .then(() =>
                                  toast('success', t.menu.categories.imageRemoveSuccess),
                                )
                                .catch((err) => toast('error', mapMenuError(err, t)))
                            }
                          >
                            {t.menu.categories.removeImage}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={index === 0 || anyMutationPending}
                          onClick={() => void moveCategory(category.categoryId, -1)}
                        >
                          <MaterialIcon name="arrow_upward" size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            index === categories.length - 1 || anyMutationPending
                          }
                          onClick={() => void moveCategory(category.categoryId, 1)}
                        >
                          <MaterialIcon name="arrow_downward" size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={anyMutationPending}
                          onClick={() => {
                            setEditCategoryTarget(category)
                            setEditCategoryName(category.name)
                            setEditCategoryDescription(category.description ?? '')
                          }}
                        >
                          {t.common.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={anyMutationPending}
                          onClick={() => setDeleteCategoryTarget(category)}
                        >
                          {t.common.delete}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Items */}
        <Card padding="none" className="overflow-hidden xl:col-span-1">
          <CardHeader>
            <CardTitle>
              <MaterialIcon name="restaurant" size={20} />
              {t.menu.items.title}
            </CardTitle>
            {canManage && categoryScope && (
              <Button size="sm" variant="secondary" onClick={() => setCreateItemOpen(true)}>
                <MaterialIcon name="add" size={16} />
                {t.common.add}
              </Button>
            )}
          </CardHeader>
          {!resolvedCategoryId ? (
            <p className="text-body-sm text-on-surface-variant px-5 py-8 text-center">
              {t.menu.items.selectCategory}
            </p>
          ) : items.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant px-5 py-8 text-center">
              {t.menu.items.empty}
            </p>
          ) : (
            <DataTable className="border-0 rounded-none shadow-none">
              <DataTableHead>
                <DataTableHeader>{t.menu.items.name}</DataTableHeader>
                <DataTableHeader>{t.menu.items.price}</DataTableHeader>
                <DataTableHeader className="text-end">
                  {t.common.actions}
                </DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {items.map((item, index) => (
                  <DataTableRow key={item.itemId}>
                    <DataTableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover border border-outline-variant/30 shrink-0"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-center shrink-0 text-on-surface-variant"
                            title={t.menu.dishPhoto}
                          >
                            <MaterialIcon name="image" size={18} />
                          </div>
                        )}
                        <div className="flex items-center gap-2 min-w-0">
                          {item.isFeatured && (
                            <MaterialIcon
                              name="star"
                              size={16}
                              className="text-warning shrink-0"
                            />
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <Num>{item.price ?? 0}</Num>
                      {item.currency ? ` ${item.currency}` : ''}
                    </DataTableCell>
                    <DataTableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={index === 0 || anyMutationPending}
                              onClick={() => void moveItem(item.itemId, -1)}
                            >
                              <MaterialIcon name="arrow_upward" size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={
                                index === items.length - 1 || anyMutationPending
                              }
                              onClick={() => void moveItem(item.itemId, 1)}
                            >
                              <MaterialIcon name="arrow_downward" size={16} />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditItem(item)}
                        >
                          {canManage ? t.common.edit : t.common.view}
                        </Button>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={anyMutationPending}
                            onClick={() => setDeleteItemTarget(item)}
                          >
                            {t.common.delete}
                          </Button>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </Card>
      </div>
      )}

      {/* Create menu */}
      <Modal
        open={createMenuOpen}
        onClose={() => !createMenu.isPending && setCreateMenuOpen(false)}
        title={t.menu.createMenu}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newMenuName.trim() || createMenu.isPending) return
            void createMenu
              .mutateAsync({
                restaurantId,
                body: { name: newMenuName.trim() },
              })
              .then(() => {
                toast('success', t.menu.menus.createSuccess)
                setNewMenuName('')
                setCreateMenuOpen(false)
              })
              .catch((err) => toast('error', mapMenuError(err, t)))
          }}
          className="space-y-4"
        >
          <Input
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder={t.menu.menus.namePlaceholder}
            required
            disabled={createMenu.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createMenu.isPending}
              onClick={() => setCreateMenuOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={createMenu.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename menu */}
      <Modal
        open={renameMenuTarget !== null}
        onClose={() => !updateMenu.isPending && setRenameMenuTarget(null)}
        title={t.menu.menus.rename}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!renameMenuTarget || !renameMenuName.trim() || updateMenu.isPending) {
              return
            }
            void updateMenu
              .mutateAsync({
                restaurantId,
                menuId: renameMenuTarget.menuId,
                body: { name: renameMenuName.trim() },
              })
              .then(() => {
                toast('success', t.menu.menus.renameSuccess)
                setRenameMenuTarget(null)
              })
              .catch((err) => toast('error', mapMenuError(err, t)))
          }}
          className="space-y-4"
        >
          <Input
            value={renameMenuName}
            onChange={(e) => setRenameMenuName(e.target.value)}
            required
            disabled={updateMenu.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={updateMenu.isPending}
              onClick={() => setRenameMenuTarget(null)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={updateMenu.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create category */}
      <Modal
        open={createCategoryOpen}
        onClose={() => !createCategory.isPending && setCreateCategoryOpen(false)}
        title={t.menu.categories.create}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newCategoryName.trim() || !menuId || createCategory.isPending) return
            void createCategory
              .mutateAsync({
                restaurantId,
                menuId,
                body: { name: newCategoryName.trim() },
              })
              .then(() => {
                toast('success', t.menu.categories.createSuccess)
                setNewCategoryName('')
                setCreateCategoryOpen(false)
              })
              .catch((err) => toast('error', mapMenuError(err, t)))
          }}
          className="space-y-4"
        >
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t.menu.categories.namePlaceholder}
            required
            disabled={createCategory.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createCategory.isPending}
              onClick={() => setCreateCategoryOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit category */}
      <Modal
        open={editCategoryTarget !== null}
        onClose={() => !updateCategory.isPending && setEditCategoryTarget(null)}
        title={t.menu.categories.edit}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (
              !editCategoryTarget ||
              !editCategoryName.trim() ||
              !menuId ||
              updateCategory.isPending
            ) {
              return
            }
            void updateCategory
              .mutateAsync({
                restaurantId,
                menuId,
                categoryId: editCategoryTarget.categoryId,
                body: {
                  name: editCategoryName.trim(),
                  description: editCategoryDescription.trim() || null,
                },
              })
              .then(() => {
                toast('success', t.menu.categories.updateSuccess)
                setEditCategoryTarget(null)
              })
              .catch((err) => toast('error', mapMenuError(err, t)))
          }}
          className="space-y-4"
        >
          <Input
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            placeholder={t.menu.categories.namePlaceholder}
            required
            disabled={updateCategory.isPending}
          />
          <Input
            value={editCategoryDescription}
            onChange={(e) => setEditCategoryDescription(e.target.value)}
            placeholder={t.menu.categories.descriptionPlaceholder}
            disabled={updateCategory.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={updateCategory.isPending}
              onClick={() => setEditCategoryTarget(null)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={updateCategory.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create item */}
      <Modal
        open={createItemOpen}
        onClose={() => !createItem.isPending && setCreateItemOpen(false)}
        title={t.menu.items.create}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!categoryScope || !newItemName.trim() || createItem.isPending) return
            const parsedPrice = Number(newItemPrice)
            if (Number.isNaN(parsedPrice)) return
            void createItem
              .mutateAsync({
                ...categoryScope,
                body: { name: newItemName.trim(), price: parsedPrice },
              })
              .then(() => {
                toast('success', t.menu.items.createSuccess)
                setNewItemName('')
                setNewItemPrice('')
                setCreateItemOpen(false)
              })
              .catch((err) => toast('error', mapMenuError(err, t)))
          }}
          className="space-y-4"
        >
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={t.menu.items.namePlaceholder}
            required
            disabled={createItem.isPending}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            placeholder={t.menu.items.pricePlaceholder}
            required
            disabled={createItem.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createItem.isPending}
              onClick={() => setCreateItemOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={createItem.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ItemEditModal
        open={editItem !== null}
        item={editItem}
        restaurantId={restaurantId}
        menuId={menuId}
        categoryId={resolvedCategoryId ?? ''}
        canManage={canManage}
        onClose={() => setEditItem(null)}
      />

      <ConfirmDialog
        open={deleteMenuTarget !== null}
        onClose={() => !deleteMenu.isPending && setDeleteMenuTarget(null)}
        title={t.menu.menus.deleteTitle}
        message={t.menu.menus.deleteBody}
        confirmLabel={t.common.delete}
        variant="danger"
        busy={deleteMenu.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (!deleteMenuTarget) return
          void deleteMenu
            .mutateAsync({
              restaurantId,
              menuId: deleteMenuTarget.menuId,
            })
            .then(() => {
              toast('success', t.menu.menus.deleteSuccess)
              setDeleteMenuTarget(null)
            })
            .catch((err) => toast('error', mapMenuError(err, t)))
        }}
      />

      <ConfirmDialog
        open={deleteCategoryTarget !== null}
        onClose={() => !deleteCategory.isPending && setDeleteCategoryTarget(null)}
        title={t.menu.categories.deleteTitle}
        message={t.menu.categories.deleteBody}
        confirmLabel={t.common.delete}
        variant="danger"
        busy={deleteCategory.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (!deleteCategoryTarget || !menuId) return
          void deleteCategory
            .mutateAsync({
              restaurantId,
              menuId,
              categoryId: deleteCategoryTarget.categoryId,
            })
            .then(() => {
              toast('success', t.menu.categories.deleteSuccess)
              setDeleteCategoryTarget(null)
              setSelectedCategoryId(null)
            })
            .catch((err) => toast('error', mapMenuError(err, t)))
        }}
      />

      <ConfirmDialog
        open={deleteItemTarget !== null}
        onClose={() => !deleteItem.isPending && setDeleteItemTarget(null)}
        title={t.menu.items.deleteTitle}
        message={t.menu.items.deleteBody}
        confirmLabel={t.common.delete}
        variant="danger"
        busy={deleteItem.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (!deleteItemTarget || !categoryScope) return
          void deleteItem
            .mutateAsync({
              ...categoryScope,
              itemId: deleteItemTarget.itemId,
            })
            .then(() => {
              toast('success', t.menu.items.deleteSuccess)
              setDeleteItemTarget(null)
            })
            .catch((err) => toast('error', mapMenuError(err, t)))
        }}
      />
    </div>
  )
}
