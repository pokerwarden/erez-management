import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
  name: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const DEMO_USER: AuthUser = {
  id: 'demo-admin',
  email: 'admin@lawfirm.co.il',
  role: 'ADMIN',
  name: 'מנהל מערכת',
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = DEMO_USER
  next()
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  req.user = DEMO_USER
  next()
}
