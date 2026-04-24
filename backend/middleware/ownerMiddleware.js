export const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === "Owner") {
    next();
  } else {
    res.status(403).json({ message: "Owner access only" });
  }
};
