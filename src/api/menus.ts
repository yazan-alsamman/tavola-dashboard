import { apiRequest } from './client'

// ---------------------------------------------------------------------------
// Response DTOs (Postman Phase 18 — Menu Management)
// ---------------------------------------------------------------------------

export type MenuStatus = 'Active' | 'Inactive' | (string & {})

export interface MenuDto {
  menuId: string
  restaurantId?: string
  name: string
  displayOrder?: number
  isDefault?: boolean
  status?: MenuStatus
  categories?: MenuCategoryDto[]
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface MenuCategoryDto {
  categoryId: string
  menuId?: string
  name: string
  description?: string | null
  displayOrder?: number
  imageId?: string | null
  imageUrl?: string | null
  items?: MenuItemDto[]
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export type MenuItemAvailabilityMode = 'always' | 'scheduled' | (string & {})

export interface MenuItemDto {
  itemId: string
  categoryId?: string
  name: string
  description?: string | null
  price?: number
  currency?: string | null
  preparationTimeMinutes?: number | null
  spicyLevel?: number | null
  calories?: number | null
  allergens?: string[]
  availabilityMode?: MenuItemAvailabilityMode
  isFeatured?: boolean
  displayOrder?: number
  imageId?: string | null
  imageUrl?: string | null
  optionGroups?: MenuItemOptionGroupDto[]
  addOns?: MenuItemAddOnDto[]
  availabilityWindows?: AvailabilityWindowDto[]
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface MenuItemOptionGroupDto {
  optionGroupId: string
  itemId?: string
  name: string
  required?: boolean
  minSelections?: number
  maxSelections?: number
  options?: MenuItemOptionDto[]
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface MenuItemOptionDto {
  optionId: string
  optionGroupId?: string
  name: string
  priceModifier?: number
  active?: boolean
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface MenuItemAddOnDto {
  addOnId: string
  itemId?: string
  name: string
  price?: number
  active?: boolean
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface AvailabilityWindowDto {
  dayOfWeek: number
  startTime: string
  endTime: string
  [key: string]: unknown
}

/** Unpaginated list payload for `GET /restaurants/:restaurantId/menus`. */
export interface MenuListData {
  items: MenuDto[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function normalizeMenuStatus(raw: Record<string, unknown>): MenuStatus | undefined {
  if (typeof raw.status === 'string' && raw.status) return raw.status
  if (typeof raw.active === 'boolean') return raw.active ? 'Active' : 'Inactive'
  return undefined
}

function normalizeOption(raw: unknown): MenuItemOptionDto {
  const record = asRecord(raw) ?? {}
  return {
    ...record,
    optionId: pickString(record, 'optionId', 'id'),
    optionGroupId:
      pickString(record, 'optionGroupId') ||
      (typeof record.optionGroupId === 'string' ? record.optionGroupId : undefined),
    name: pickString(record, 'name') || 'Option',
    priceModifier:
      typeof record.priceModifier === 'number' ? record.priceModifier : undefined,
    active: typeof record.active === 'boolean' ? record.active : undefined,
  }
}

function normalizeOptionGroup(raw: unknown): MenuItemOptionGroupDto {
  const record = asRecord(raw) ?? {}
  const options = Array.isArray(record.options)
    ? record.options.map(normalizeOption)
    : undefined
  return {
    ...record,
    optionGroupId: pickString(record, 'optionGroupId', 'id'),
    itemId: pickString(record, 'itemId') || undefined,
    name: pickString(record, 'name') || 'Options',
    required: typeof record.required === 'boolean' ? record.required : undefined,
    minSelections:
      typeof record.minSelections === 'number' ? record.minSelections : undefined,
    maxSelections:
      typeof record.maxSelections === 'number' ? record.maxSelections : undefined,
    options,
  }
}

function normalizeAddOn(raw: unknown): MenuItemAddOnDto {
  const record = asRecord(raw) ?? {}
  return {
    ...record,
    addOnId: pickString(record, 'addOnId', 'id'),
    itemId: pickString(record, 'itemId') || undefined,
    name: pickString(record, 'name') || 'Add-on',
    price: typeof record.price === 'number' ? record.price : undefined,
    active: typeof record.active === 'boolean' ? record.active : undefined,
  }
}

function normalizeItem(raw: unknown): MenuItemDto {
  const record = asRecord(raw) ?? {}
  return {
    ...record,
    itemId: pickString(record, 'itemId', 'id'),
    categoryId: pickString(record, 'categoryId') || undefined,
    name: pickString(record, 'name') || 'Item',
    description:
      typeof record.description === 'string' || record.description === null
        ? (record.description as string | null)
        : undefined,
    price: typeof record.price === 'number' ? record.price : undefined,
    currency: typeof record.currency === 'string' ? record.currency : undefined,
    isFeatured:
      typeof record.isFeatured === 'boolean' ? record.isFeatured : undefined,
    displayOrder:
      typeof record.displayOrder === 'number' ? record.displayOrder : undefined,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    optionGroups: Array.isArray(record.optionGroups)
      ? record.optionGroups.map(normalizeOptionGroup)
      : undefined,
    addOns: Array.isArray(record.addOns)
      ? record.addOns.map(normalizeAddOn)
      : undefined,
    availabilityWindows: Array.isArray(record.availabilityWindows)
      ? (record.availabilityWindows as AvailabilityWindowDto[])
      : undefined,
  }
}

function normalizeCategory(raw: unknown): MenuCategoryDto {
  const record = asRecord(raw) ?? {}
  return {
    ...record,
    categoryId: pickString(record, 'categoryId', 'id'),
    menuId: pickString(record, 'menuId') || undefined,
    name: pickString(record, 'name') || 'Category',
    description:
      typeof record.description === 'string' || record.description === null
        ? (record.description as string | null)
        : undefined,
    displayOrder:
      typeof record.displayOrder === 'number' ? record.displayOrder : undefined,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    items: Array.isArray(record.items)
      ? record.items.map(normalizeItem)
      : undefined,
  }
}

/** Maps live API menu payloads (`id` / `active`) onto dashboard DTOs (`menuId` / `status`). */
export function normalizeMenu(raw: unknown): MenuDto {
  const record = asRecord(raw) ?? {}
  return {
    ...record,
    menuId: pickString(record, 'menuId', 'id'),
    restaurantId: pickString(record, 'restaurantId') || undefined,
    name: pickString(record, 'name') || 'Menu',
    displayOrder:
      typeof record.displayOrder === 'number' ? record.displayOrder : undefined,
    isDefault: typeof record.isDefault === 'boolean' ? record.isDefault : undefined,
    status: normalizeMenuStatus(record),
    categories: Array.isArray(record.categories)
      ? record.categories.map(normalizeCategory)
      : undefined,
  }
}

function normalizeMenuList(data: unknown): MenuDto[] {
  if (Array.isArray(data)) return data.map(normalizeMenu)
  const record = asRecord(data)
  if (record && Array.isArray(record.items)) {
    return record.items.map(normalizeMenu)
  }
  return []
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface CreateMenuRequest {
  name: string
}

export interface UpdateMenuRequest {
  name?: string
  displayOrder?: number
}

export interface CreateMenuCategoryRequest {
  name: string
  description?: string | null
}

export interface UpdateMenuCategoryRequest {
  name?: string
  description?: string | null
}

/** Whole-set sibling reorder — `orderedIds` must match every non-deleted id exactly once. */
export interface ReorderRequest {
  orderedIds: string[]
}

export interface CreateMenuItemRequest {
  name: string
  description?: string | null
  price: number
  currency?: string | null
  preparationTimeMinutes?: number | null
  spicyLevel?: number | null
  calories?: number | null
  allergens?: string[]
}

export interface UpdateMenuItemRequest {
  name?: string
  description?: string | null
  price?: number
  currency?: string | null
  preparationTimeMinutes?: number | null
  spicyLevel?: number | null
  calories?: number | null
  allergens?: string[]
  availabilityMode?: MenuItemAvailabilityMode
}

export interface ReplaceAvailabilityWindowsRequest {
  windows: AvailabilityWindowDto[]
}

export interface CreateMenuItemOptionGroupRequest {
  name: string
  required?: boolean
  minSelections?: number
  maxSelections?: number
}

export interface UpdateMenuItemOptionGroupRequest {
  name?: string
  required?: boolean
  minSelections?: number
  maxSelections?: number
}

export interface CreateMenuItemOptionRequest {
  name: string
  priceModifier?: number
}

export interface UpdateMenuItemOptionRequest {
  name?: string
  priceModifier?: number
  active?: boolean
}

export interface CreateMenuItemAddOnRequest {
  name: string
  price: number
}

export interface UpdateMenuItemAddOnRequest {
  name?: string
  price?: number
  active?: boolean
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function menusBase(restaurantId: string): string {
  return `/restaurants/${restaurantId}/menus`
}

function menuPath(restaurantId: string, menuId: string): string {
  return `${menusBase(restaurantId)}/${menuId}`
}

function categoriesBase(restaurantId: string, menuId: string): string {
  return `${menuPath(restaurantId, menuId)}/categories`
}

function categoryPath(
  restaurantId: string,
  menuId: string,
  categoryId: string,
): string {
  return `${categoriesBase(restaurantId, menuId)}/${categoryId}`
}

function itemsBase(
  restaurantId: string,
  menuId: string,
  categoryId: string,
): string {
  return `${categoryPath(restaurantId, menuId, categoryId)}/items`
}

function itemPath(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): string {
  return `${itemsBase(restaurantId, menuId, categoryId)}/${itemId}`
}

function optionGroupsBase(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): string {
  return `${itemPath(restaurantId, menuId, categoryId, itemId)}/option-groups`
}

function optionGroupPath(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
): string {
  return `${optionGroupsBase(restaurantId, menuId, categoryId, itemId)}/${optionGroupId}`
}

function addOnsBase(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): string {
  return `${itemPath(restaurantId, menuId, categoryId, itemId)}/add-ons`
}

function imageUploadBody(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

/** Public — lists active menus for a restaurant (unpaginated). */
export async function listMenus(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<MenuDto[]> {
  const data = await apiRequest<unknown>(menusBase(restaurantId), {
    auth: false,
    signal,
  })
  return normalizeMenuList(data)
}

/** Public — full nested tree for the restaurant default menu. */
export async function getDefaultMenu(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(`${menusBase(restaurantId)}/default`, {
    auth: false,
    signal,
  })
  return normalizeMenu(data)
}

/** Public — full nested tree for a specific menu. */
export async function getMenu(
  restaurantId: string,
  menuId: string,
  signal?: AbortSignal,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(menuPath(restaurantId, menuId), {
    auth: false,
    signal,
  })
  return normalizeMenu(data)
}

export async function createMenu(
  restaurantId: string,
  body: CreateMenuRequest,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(menusBase(restaurantId), {
    method: 'POST',
    body: { name: body.name.trim() },
  })
  return normalizeMenu(data)
}

export async function updateMenu(
  restaurantId: string,
  menuId: string,
  body: UpdateMenuRequest,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(menuPath(restaurantId, menuId), {
    method: 'PATCH',
    body: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.displayOrder !== undefined
        ? { displayOrder: body.displayOrder }
        : {}),
    },
  })
  return normalizeMenu(data)
}

export async function activateMenu(
  restaurantId: string,
  menuId: string,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(
    `${menuPath(restaurantId, menuId)}/activate`,
    { method: 'POST' },
  )
  return normalizeMenu(data)
}

export async function deactivateMenu(
  restaurantId: string,
  menuId: string,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(
    `${menuPath(restaurantId, menuId)}/deactivate`,
    { method: 'POST' },
  )
  return normalizeMenu(data)
}

export async function setDefaultMenu(
  restaurantId: string,
  menuId: string,
): Promise<MenuDto> {
  const data = await apiRequest<unknown>(
    `${menuPath(restaurantId, menuId)}/set-default`,
    { method: 'POST' },
  )
  return normalizeMenu(data)
}

/** Soft-delete. */
export async function deleteMenu(
  restaurantId: string,
  menuId: string,
): Promise<void> {
  await apiRequest<undefined>(menuPath(restaurantId, menuId), {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createMenuCategory(
  restaurantId: string,
  menuId: string,
  body: CreateMenuCategoryRequest,
): Promise<MenuCategoryDto> {
  const data = await apiRequest<unknown>(categoriesBase(restaurantId, menuId), {
    method: 'POST',
    body: {
      name: body.name.trim(),
      ...(body.description !== undefined ? { description: body.description } : {}),
    },
  })
  return normalizeCategory(data)
}

export async function updateMenuCategory(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  body: UpdateMenuCategoryRequest,
): Promise<MenuCategoryDto> {
  const data = await apiRequest<unknown>(
    categoryPath(restaurantId, menuId, categoryId),
    {
      method: 'PATCH',
      body: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
      },
    },
  )
  return normalizeCategory(data)
}

export async function reorderMenuCategories(
  restaurantId: string,
  menuId: string,
  body: ReorderRequest,
): Promise<MenuCategoryDto[]> {
  const data = await apiRequest<unknown>(
    `${categoriesBase(restaurantId, menuId)}/reorder`,
    {
      method: 'PATCH',
      body: { orderedIds: body.orderedIds },
    },
  )
  return Array.isArray(data) ? data.map(normalizeCategory) : []
}

/** Soft-delete. */
export async function deleteMenuCategory(
  restaurantId: string,
  menuId: string,
  categoryId: string,
): Promise<void> {
  await apiRequest<undefined>(categoryPath(restaurantId, menuId, categoryId), {
    method: 'DELETE',
  })
}

export async function uploadMenuCategoryImage(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  file: File,
): Promise<MenuCategoryDto> {
  const data = await apiRequest<unknown>(
    `${categoryPath(restaurantId, menuId, categoryId)}/image`,
    {
      method: 'POST',
      body: imageUploadBody(file),
    },
  )
  return normalizeCategory(data)
}

export async function removeMenuCategoryImage(
  restaurantId: string,
  menuId: string,
  categoryId: string,
): Promise<MenuCategoryDto> {
  const data = await apiRequest<unknown>(
    `${categoryPath(restaurantId, menuId, categoryId)}/image`,
    { method: 'DELETE' },
  )
  return normalizeCategory(data)
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function createMenuItem(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  body: CreateMenuItemRequest,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    itemsBase(restaurantId, menuId, categoryId),
    {
      method: 'POST',
      body: {
        name: body.name.trim(),
        price: body.price,
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.preparationTimeMinutes !== undefined
          ? { preparationTimeMinutes: body.preparationTimeMinutes }
          : {}),
        ...(body.spicyLevel !== undefined ? { spicyLevel: body.spicyLevel } : {}),
        ...(body.calories !== undefined ? { calories: body.calories } : {}),
        ...(body.allergens !== undefined ? { allergens: body.allergens } : {}),
      },
    },
  )
  return normalizeItem(data)
}

export async function updateMenuItem(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  body: UpdateMenuItemRequest,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    itemPath(restaurantId, menuId, categoryId, itemId),
    {
      method: 'PATCH',
      body: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.preparationTimeMinutes !== undefined
          ? { preparationTimeMinutes: body.preparationTimeMinutes }
          : {}),
        ...(body.spicyLevel !== undefined ? { spicyLevel: body.spicyLevel } : {}),
        ...(body.calories !== undefined ? { calories: body.calories } : {}),
        ...(body.allergens !== undefined ? { allergens: body.allergens } : {}),
        ...(body.availabilityMode !== undefined
          ? { availabilityMode: body.availabilityMode }
          : {}),
      },
    },
  )
  return normalizeItem(data)
}

export async function reorderMenuItems(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  body: ReorderRequest,
): Promise<MenuItemDto[]> {
  const data = await apiRequest<unknown>(
    `${itemsBase(restaurantId, menuId, categoryId)}/reorder`,
    {
      method: 'PATCH',
      body: { orderedIds: body.orderedIds },
    },
  )
  return Array.isArray(data) ? data.map(normalizeItem) : []
}

/** Replaces the item's scheduled availability windows (whole-set). */
export async function replaceMenuItemAvailability(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  body: ReplaceAvailabilityWindowsRequest,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    `${itemPath(restaurantId, menuId, categoryId, itemId)}/availability`,
    {
      method: 'PATCH',
      body: { windows: body.windows },
    },
  )
  return normalizeItem(data)
}

export async function featureMenuItem(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    `${itemPath(restaurantId, menuId, categoryId, itemId)}/feature`,
    { method: 'POST' },
  )
  return normalizeItem(data)
}

export async function unfeatureMenuItem(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    `${itemPath(restaurantId, menuId, categoryId, itemId)}/unfeature`,
    { method: 'POST' },
  )
  return normalizeItem(data)
}

export async function uploadMenuItemImage(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  file: File,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    `${itemPath(restaurantId, menuId, categoryId, itemId)}/image`,
    {
      method: 'POST',
      body: imageUploadBody(file),
    },
  )
  return normalizeItem(data)
}

export async function removeMenuItemImage(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): Promise<MenuItemDto> {
  const data = await apiRequest<unknown>(
    `${itemPath(restaurantId, menuId, categoryId, itemId)}/image`,
    { method: 'DELETE' },
  )
  return normalizeItem(data)
}

/** Soft-delete. */
export async function deleteMenuItem(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
): Promise<void> {
  await apiRequest<undefined>(
    itemPath(restaurantId, menuId, categoryId, itemId),
    { method: 'DELETE' },
  )
}

// ---------------------------------------------------------------------------
// Option groups
// ---------------------------------------------------------------------------

export async function createMenuItemOptionGroup(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  body: CreateMenuItemOptionGroupRequest,
): Promise<MenuItemOptionGroupDto> {
  const data = await apiRequest<unknown>(
    optionGroupsBase(restaurantId, menuId, categoryId, itemId),
    {
      method: 'POST',
      body: {
        name: body.name.trim(),
        ...(body.required !== undefined ? { required: body.required } : {}),
        ...(body.minSelections !== undefined
          ? { minSelections: body.minSelections }
          : {}),
        ...(body.maxSelections !== undefined
          ? { maxSelections: body.maxSelections }
          : {}),
      },
    },
  )
  return normalizeOptionGroup(data)
}

export async function updateMenuItemOptionGroup(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
  body: UpdateMenuItemOptionGroupRequest,
): Promise<MenuItemOptionGroupDto> {
  const data = await apiRequest<unknown>(
    optionGroupPath(restaurantId, menuId, categoryId, itemId, optionGroupId),
    {
      method: 'PATCH',
      body: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.required !== undefined ? { required: body.required } : {}),
        ...(body.minSelections !== undefined
          ? { minSelections: body.minSelections }
          : {}),
        ...(body.maxSelections !== undefined
          ? { maxSelections: body.maxSelections }
          : {}),
      },
    },
  )
  return normalizeOptionGroup(data)
}

/** Soft-delete. */
export async function deleteMenuItemOptionGroup(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
): Promise<void> {
  await apiRequest<undefined>(
    optionGroupPath(restaurantId, menuId, categoryId, itemId, optionGroupId),
    { method: 'DELETE' },
  )
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export async function createMenuItemOption(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
  body: CreateMenuItemOptionRequest,
): Promise<MenuItemOptionDto> {
  const data = await apiRequest<unknown>(
    `${optionGroupPath(restaurantId, menuId, categoryId, itemId, optionGroupId)}/options`,
    {
      method: 'POST',
      body: {
        name: body.name.trim(),
        ...(body.priceModifier !== undefined
          ? { priceModifier: body.priceModifier }
          : {}),
      },
    },
  )
  return normalizeOption(data)
}

export async function updateMenuItemOption(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
  optionId: string,
  body: UpdateMenuItemOptionRequest,
): Promise<MenuItemOptionDto> {
  const data = await apiRequest<unknown>(
    `${optionGroupPath(restaurantId, menuId, categoryId, itemId, optionGroupId)}/options/${optionId}`,
    {
      method: 'PATCH',
      body: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.priceModifier !== undefined
          ? { priceModifier: body.priceModifier }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    },
  )
  return normalizeOption(data)
}

/** Soft-delete. */
export async function deleteMenuItemOption(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  optionGroupId: string,
  optionId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `${optionGroupPath(restaurantId, menuId, categoryId, itemId, optionGroupId)}/options/${optionId}`,
    { method: 'DELETE' },
  )
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export async function createMenuItemAddOn(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  body: CreateMenuItemAddOnRequest,
): Promise<MenuItemAddOnDto> {
  const data = await apiRequest<unknown>(
    addOnsBase(restaurantId, menuId, categoryId, itemId),
    {
      method: 'POST',
      body: {
        name: body.name.trim(),
        price: body.price,
      },
    },
  )
  return normalizeAddOn(data)
}

export async function updateMenuItemAddOn(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  addOnId: string,
  body: UpdateMenuItemAddOnRequest,
): Promise<MenuItemAddOnDto> {
  const data = await apiRequest<unknown>(
    `${addOnsBase(restaurantId, menuId, categoryId, itemId)}/${addOnId}`,
    {
      method: 'PATCH',
      body: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    },
  )
  return normalizeAddOn(data)
}

/** Soft-delete. */
export async function deleteMenuItemAddOn(
  restaurantId: string,
  menuId: string,
  categoryId: string,
  itemId: string,
  addOnId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `${addOnsBase(restaurantId, menuId, categoryId, itemId)}/${addOnId}`,
    { method: 'DELETE' },
  )
}
