import { NextRequest, NextResponse } from 'next/server';
import { getRoomDetails } from '@/actions/competitionActions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    console.log('[RoomAPI] Fetching room details for:', roomId);

    // Call the actual backend API
    const room = await getRoomDetails(roomId);
    
    if (!room) {
      console.log('[RoomAPI] Room not found:', roomId);
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    console.log('[RoomAPI] Room found:', room.id);

    return NextResponse.json({
      success: true,
      room: room
    });

  } catch (error) {
    console.error('[RoomAPI] Error fetching room:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 