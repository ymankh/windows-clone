export const MenuItemVariants = {
  default: "default",
  destructive: "destructive",
} as const;

export type MenuItemVariant =
  (typeof MenuItemVariants)[keyof typeof MenuItemVariants];
