import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
        roleId?: string;
    };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        console.log('Received authHeader:', authHeader);
        console.log('Extracted token:', token);
        console.log('Token length:', token?.length);

        jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user: any) => {
            if (err) {
                console.error('JWT VERIFY ERROR DETAILS:', err.message, err.name);
                return res.status(401).json({ error: 'JWT Verification failed', debug: err.message });
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};
