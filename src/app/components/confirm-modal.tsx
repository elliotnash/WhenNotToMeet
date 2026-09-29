import { Button } from '@/components/ui/button';
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import type { ReactNode } from 'react';

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  intent = 'danger',
  isPending,
  error,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  intent?: 'danger' | 'primary';
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
}) {
  return (
    <ModalContent role="alertdialog" isOpen={isOpen} onOpenChange={onOpenChange} size="sm">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        {description ? <ModalDescription>{description}</ModalDescription> : null}
      </ModalHeader>
      {children || error ? (
        <ModalBody>
          {children}
          {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}
        </ModalBody>
      ) : null}
      <ModalFooter>
        <ModalClose>Cancel</ModalClose>
        <Button intent={intent} isPending={isPending} onPress={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
