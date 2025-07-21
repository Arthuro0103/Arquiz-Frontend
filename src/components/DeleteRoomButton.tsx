'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteRoom } from '@/actions/competitionActions';
import { useRouter } from 'next/navigation';

interface DeleteRoomButtonProps {
  roomId: string;
  roomName: string;
  isOwner: boolean;
  disabled?: boolean;
  onDeleted?: (deletedRoomId: string) => void;
}

export function DeleteRoomButton({ roomId, roomName, isOwner, disabled = false, onDeleted }: DeleteRoomButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!isOwner) {
      toast.error('Você só pode excluir salas que criou');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteRoom(roomId);
      
      if (result.success) {
        toast.success(result.message);
        setIsOpen(false);
        
        // Call onDeleted callback if provided, otherwise refresh the page
        if (onDeleted) {
          onDeleted(roomId);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Erro inesperado ao excluir sala');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <Button variant="destructive" size="sm" disabled>
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={disabled || isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Sala de Competição</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a sala <strong>&ldquo;{roomName}&rdquo;</strong>?
            <br />
            <br />
            <span className="text-sm text-gray-600">
              Esta ação não pode ser desfeita. A sala &ldquo;{roomName}&rdquo; será removida permanentemente.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Sala
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 