import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"

export function requireShopOwner(req, res, next) {
  if (!isServiceProviderRole(req.user?.role)) {
    res.status(403)
    return next(new Error("Shop owner access only"))
  }
  next()
}
