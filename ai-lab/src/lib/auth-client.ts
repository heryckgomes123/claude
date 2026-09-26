'use client'
import { createAuthClient } from 'better-auth/react'

/** Cliente de autenticação — mesma origem, sem URL fixa. */
export const authClient = createAuthClient()
