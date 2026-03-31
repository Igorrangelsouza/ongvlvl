'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoAnimalPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/animais')
  }, [])

  return null
}
