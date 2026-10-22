const authorize = (...roles) => {
    return (req, res, next) => {
        // Check whether the user is authenticated.
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // Check whether the user has the required role.
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. You do not have permission."
            });
        }

        next();
    };
};

// Support the team's existing imports.
module.exports = { authorize };

// Also support direct middleware imports.
module.exports.authorize = authorize;
