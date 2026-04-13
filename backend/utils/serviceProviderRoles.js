/** Roles that use the shop-owner provider dashboard and shop/service APIs (ShopService.shopOwner ref). */
export const SERVICE_PROVIDER_ROLES = ["shop-owner", "independent-mechanic-technician"]

export function isServiceProviderRole(role) {
  return SERVICE_PROVIDER_ROLES.includes(role)
}
