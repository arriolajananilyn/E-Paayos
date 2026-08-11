export function requireMechanicTechnician(req, res, next) {
  if (req.user?.role !== "mechanic-technician" && req.user?.role !== "oncall-mechanic-technician" && req.user?.role !== "independent-mechanic-technician") {
    res.status(403)
    return next(new Error("Mechanic / technician access only"))
  }
  next()
}
