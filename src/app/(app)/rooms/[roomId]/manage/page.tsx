'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ManageRoomPage() {
  const params = useParams()
  const { data: session, status: sessionStatus } = useSession()
  const roomId = params.roomId as string
  
  console.log('[ManageRoomPage] Simple page loaded:', { roomId, sessionStatus, route: '/rooms/[roomId]/manage' })

  if (sessionStatus === 'loading') {
    return <div>Loading...</div>
  }

  if (sessionStatus === 'unauthenticated') {
    return <div>Not authenticated</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-4">Manage Room</h1>
          <p>Room ID: {roomId}</p>
          <p>User: {session?.user?.name}</p>
          <p>Status: {sessionStatus}</p>
          <p>This is a simplified test page for room management.</p>
        </div>
      </div>
    </div>
  )
} 