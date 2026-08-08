import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  activateMenu,
  createMenu,
  createMenuCategory,
  createMenuItem,
  createMenuItemAddOn,
  createMenuItemOption,
  createMenuItemOptionGroup,
  deactivateMenu,
  deleteMenu,
  deleteMenuCategory,
  deleteMenuItem,
  deleteMenuItemAddOn,
  deleteMenuItemOption,
  deleteMenuItemOptionGroup,
  featureMenuItem,
  removeMenuCategoryImage,
  removeMenuItemImage,
  reorderMenuCategories,
  reorderMenuItems,
  replaceMenuItemAvailability,
  setDefaultMenu,
  unfeatureMenuItem,
  updateMenu,
  updateMenuCategory,
  updateMenuItem,
  updateMenuItemAddOn,
  updateMenuItemOption,
  updateMenuItemOptionGroup,
  uploadMenuCategoryImage,
  uploadMenuItemImage,
  type CreateMenuCategoryRequest,
  type CreateMenuItemAddOnRequest,
  type CreateMenuItemOptionGroupRequest,
  type CreateMenuItemOptionRequest,
  type CreateMenuItemRequest,
  type CreateMenuRequest,
  type ReplaceAvailabilityWindowsRequest,
  type ReorderRequest,
  type UpdateMenuCategoryRequest,
  type UpdateMenuItemAddOnRequest,
  type UpdateMenuItemOptionGroupRequest,
  type UpdateMenuItemOptionRequest,
  type UpdateMenuItemRequest,
  type UpdateMenuRequest,
} from '@/api/menus'
import { menuKeys } from '@/lib/queryKeys'

/** Captured at mutation invoke — never re-read from live UI scope in onSuccess. */
export interface MenuMutationScope {
  restaurantId: string
}

export interface MenuResourceScope extends MenuMutationScope {
  menuId: string
}

export interface MenuCategoryScope extends MenuResourceScope {
  categoryId: string
}

export interface MenuItemScope extends MenuCategoryScope {
  itemId: string
}

export interface MenuOptionGroupScope extends MenuItemScope {
  optionGroupId: string
}

export interface MenuOptionScope extends MenuOptionGroupScope {
  optionId: string
}

export interface MenuAddOnScope extends MenuItemScope {
  addOnId: string
}

async function invalidateMenuList(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: MenuMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: menuKeys.lists(scope.restaurantId),
  })
}

async function invalidateMenuDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: MenuResourceScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: menuKeys.detail(scope.restaurantId, scope.menuId),
  })
}

async function invalidateDefaultMenu(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: MenuMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: menuKeys.default(scope.restaurantId),
  })
}

async function invalidateMenuTree(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: MenuResourceScope,
): Promise<void> {
  await Promise.all([
    invalidateMenuList(queryClient, scope),
    invalidateMenuDetail(queryClient, scope),
    invalidateDefaultMenu(queryClient, scope),
  ])
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

export function useCreateMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuMutationScope & { body: CreateMenuRequest }) =>
      createMenu(input.restaurantId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateMenuList(queryClient, vars)
    },
  })
}

export function useUpdateMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuResourceScope & { body: UpdateMenuRequest },
    ) => updateMenu(input.restaurantId, input.menuId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useActivateMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuResourceScope) =>
      activateMenu(input.restaurantId, input.menuId),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeactivateMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuResourceScope) =>
      deactivateMenu(input.restaurantId, input.menuId),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useSetDefaultMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuResourceScope) =>
      setDefaultMenu(input.restaurantId, input.menuId),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuResourceScope) =>
      deleteMenu(input.restaurantId, input.menuId),
    onSuccess: async (_void, vars) => {
      queryClient.removeQueries({
        queryKey: menuKeys.detail(vars.restaurantId, vars.menuId),
      })
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function useCreateMenuCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuResourceScope & { body: CreateMenuCategoryRequest },
    ) => createMenuCategory(input.restaurantId, input.menuId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUpdateMenuCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuCategoryScope & { body: UpdateMenuCategoryRequest },
    ) =>
      updateMenuCategory(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useReorderMenuCategoriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuResourceScope & { body: ReorderRequest }) =>
      reorderMenuCategories(input.restaurantId, input.menuId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuCategoryScope) =>
      deleteMenuCategory(
        input.restaurantId,
        input.menuId,
        input.categoryId,
      ),
    onSuccess: async (_void, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUploadMenuCategoryImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuCategoryScope & { file: File }) =>
      uploadMenuCategoryImage(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.file,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useRemoveMenuCategoryImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuCategoryScope) =>
      removeMenuCategoryImage(
        input.restaurantId,
        input.menuId,
        input.categoryId,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function useCreateMenuItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuCategoryScope & { body: CreateMenuItemRequest },
    ) =>
      createMenuItem(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUpdateMenuItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope & { body: UpdateMenuItemRequest }) =>
      updateMenuItem(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useReorderMenuItemsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuCategoryScope & { body: ReorderRequest }) =>
      reorderMenuItems(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useReplaceMenuItemAvailabilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuItemScope & { body: ReplaceAvailabilityWindowsRequest },
    ) =>
      replaceMenuItemAvailability(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useFeatureMenuItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope) =>
      featureMenuItem(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUnfeatureMenuItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope) =>
      unfeatureMenuItem(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUploadMenuItemImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope & { file: File }) =>
      uploadMenuItemImage(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.file,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useRemoveMenuItemImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope) =>
      removeMenuItemImage(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuItemScope) =>
      deleteMenuItem(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
      ),
    onSuccess: async (_void, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

// ---------------------------------------------------------------------------
// Option groups
// ---------------------------------------------------------------------------

export function useCreateMenuItemOptionGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuItemScope & { body: CreateMenuItemOptionGroupRequest },
    ) =>
      createMenuItemOptionGroup(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUpdateMenuItemOptionGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuOptionGroupScope & { body: UpdateMenuItemOptionGroupRequest },
    ) =>
      updateMenuItemOptionGroup(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.optionGroupId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuItemOptionGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuOptionGroupScope) =>
      deleteMenuItemOptionGroup(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.optionGroupId,
      ),
    onSuccess: async (_void, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export function useCreateMenuItemOptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuOptionGroupScope & { body: CreateMenuItemOptionRequest },
    ) =>
      createMenuItemOption(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.optionGroupId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUpdateMenuItemOptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuOptionScope & { body: UpdateMenuItemOptionRequest },
    ) =>
      updateMenuItemOption(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.optionGroupId,
        input.optionId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuItemOptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuOptionScope) =>
      deleteMenuItemOption(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.optionGroupId,
        input.optionId,
      ),
    onSuccess: async (_void, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export function useCreateMenuItemAddOnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuItemScope & { body: CreateMenuItemAddOnRequest },
    ) =>
      createMenuItemAddOn(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useUpdateMenuItemAddOnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: MenuAddOnScope & { body: UpdateMenuItemAddOnRequest },
    ) =>
      updateMenuItemAddOn(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.addOnId,
        input.body,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}

export function useDeleteMenuItemAddOnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuAddOnScope) =>
      deleteMenuItemAddOn(
        input.restaurantId,
        input.menuId,
        input.categoryId,
        input.itemId,
        input.addOnId,
      ),
    onSuccess: async (_void, vars) => {
      await invalidateMenuTree(queryClient, vars)
    },
  })
}
