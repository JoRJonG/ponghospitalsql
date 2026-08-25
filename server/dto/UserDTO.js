export function toPublicUserDTO(user) {
  if (!user) return null
  return {
    id: user._id ?? user.id,
    username: user.username,
    roles: user.roles || [],
    permissions: user.permissions || [],
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
