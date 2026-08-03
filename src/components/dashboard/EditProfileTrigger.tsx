'use client'

import { EditProfileModal } from '@/components/dashboard/EditProfileModal'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

type Props = {
  username: string
  currentColor: string | null
  currentImage: string | null
}

export function EditProfileTrigger({ username, currentColor, currentImage }: Props) {
  const t = useTranslations('acc')
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="btn btn--soft btn--sm account__edit"
        onClick={() => setOpen(true)}
      >
        <i className="ph ph-pencil-simple" aria-hidden="true" />
        <span>{t('editProfile')}</span>
      </button>
      <EditProfileModal
        open={open}
        onClose={() => setOpen(false)}
        username={username}
        currentColor={currentColor}
        currentImage={currentImage}
      />
    </>
  )
}
