export const restrictAdminActions = (req, res, next) => {
    if (req.user.role === 'admin') {
        const method = req.method;
        if(method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
            return res.status(403).json({ message: 'Admins are not allowed to perform this action.' });
        }

    }
    next();
}

export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
}