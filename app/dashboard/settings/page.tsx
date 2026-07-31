import React from 'react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <div className="grid gap-6">
        <div className="p-6 border border-border rounded-xl bg-card">
          <h2 className="text-lg font-semibold mb-4">Coming Soon</h2>
          <p className="text-sm text-muted-foreground">
            Settings and profile management will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  )
}
