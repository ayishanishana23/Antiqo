import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    let token;

    // Check Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info (id + role) to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
