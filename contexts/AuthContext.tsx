// contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import { auth } from '../lib/firebase' // Firebaseの認証機能をインポート
import { onAuthStateChanged } from 'firebase/auth' // Firebase Auth Web SDK

// コンテキストの作成
const AuthContext = createContext<any>(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Firebaseの認証状態の変化を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsLoading(false)
    })

    // クリーンアップ関数でリスナーを解除
    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>
}

// useAuth フックでユーザー情報を取得
export const useAuth = () => useContext(AuthContext)
