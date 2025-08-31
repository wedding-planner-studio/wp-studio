import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import GuestForm from '../guests/GuestForm';

interface GuestModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedGuest: any;
  handleSaveGuest: (data: any) => void;
  handleCloseModal: () => void;
  handleDelete: (id: string) => void;
  eventId: string;
}

export default function GuestModal({
  isModalOpen,
  setIsModalOpen,
  selectedGuest,
  handleSaveGuest,
  handleCloseModal,
  eventId,
  handleDelete,
}: GuestModalProps) {
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-4xl p-0 h-[95vh] overflow-y-auto" hideCloseButton>
        <DialogHeader className="px-8 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-normal" />
        </DialogHeader>
        <GuestForm
          eventId={eventId}
          initialData={selectedGuest}
          isLocalUpdate
          onSave={handleSaveGuest}
          onCancel={handleCloseModal}
          handleDelete={handleDelete}
        />
      </DialogContent>
    </Dialog>
  );
}
