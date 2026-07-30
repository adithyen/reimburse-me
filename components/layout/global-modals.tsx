'use client'

import { useUIStore } from '@/store/ui-store'
import { ImportWizard } from '@/components/transactions/import-wizard'

export function GlobalModals() {
  const { importModalOpen, setImportModalOpen } = useUIStore()

  return (
    <>
      <ImportWizard open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </>
  )
}
