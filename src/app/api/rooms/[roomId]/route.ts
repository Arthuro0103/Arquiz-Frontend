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

    const room = await getRoomDetails(roomId);
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room
    });

  } catch (error) {
    console.error('Error fetching room details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 