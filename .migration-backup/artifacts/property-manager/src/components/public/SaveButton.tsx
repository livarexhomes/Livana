'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { saveProperty, unsaveProperty } from '@/lib/actions/user'

interface SaveButtonProps {
  propertyId: string
  /** True when the current user has already saved this property */
  saved: boolean
  /** True when a tenant session exists — false means anonymous */
  isAuthenticated: boolean
}

export default function SaveButton({ propertyId, saved: initialSaved, isAuthenticated }: SaveButtonProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault() // prevent the parent <Link> from navigating
    e.stopPropagation()

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    startTransition(async () => {
      if (saved) {
        await unsaveProperty(propertyId)
        setSaved(false)
      } else {
        await saveProperty(propertyId)
        setSaved(true)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={saved ? 'Remove from saved' : 'Save property'}
      className={`w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center
        transition-all shadow-sm disabled:opacity-50
        ${saved ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500 hover:bg-white'}`}
    >
      <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
    </button>
  )
}
