import { useRef, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, X } from "lucide-react";

type ResultSuccessContentProps = {
  title?: string;
  description?: string;
  onBackToList: () => void;
  primaryActionRef?: RefObject<HTMLButtonElement | null>;
};

export function ResultSuccessContent({
  title = "Result Saved Successfully",
  description = "The laboratory result has been saved. Close this message to review the result, or return to the laboratory request list.",
  onBackToList,
  primaryActionRef,
}: ResultSuccessContentProps) {
  return (
    <div className="flex min-h-[292px] flex-col font-sans">
      <Dialog.Close
        aria-label="Close success message"
        className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded text-gray-300 outline-sky-400 hover:bg-gray-50 hover:text-gray-500"
      >
        <X size={15} strokeWidth={1.25} />
      </Dialog.Close>
      <div className="flex flex-1 flex-col items-center px-6 pt-[90px] pb-8 text-center">
        <span
          className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-green-500 text-white"
          aria-hidden="true"
        >
          <Check size={29} strokeWidth={1.2} />
        </span>
        <Dialog.Title className="mt-3 text-lg font-semibold text-gray-900">
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
          {description}
        </Dialog.Description>
      </div>
      <footer className="flex items-center justify-end gap-2 px-3 pb-2.5">
        <Dialog.Close className="inline-flex min-h-9 min-w-16 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-sky-700 outline-sky-400 hover:bg-sky-50">
          Close
        </Dialog.Close>
        <button
          ref={primaryActionRef}
          type="button"
          onClick={onBackToList}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-sky-500 bg-sky-500 px-3 py-2 text-sm font-medium text-white outline-sky-500 hover:border-sky-600 hover:bg-sky-600"
        >
          Back to list
        </button>
      </footer>
    </div>
  );
}

type ResultSuccessOverlayProps = {
  title?: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  onBackToList: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export default function ResultSuccessOverlay({
  title,
  description,
  open,
  onClose,
  onBackToList,
  returnFocusRef,
}: ResultSuccessOverlayProps) {
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Viewport className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup
            initialFocus={primaryActionRef}
            finalFocus={returnFocusRef}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl outline-none"
          >
            <ResultSuccessContent
              title={title}
              description={description}
              primaryActionRef={primaryActionRef}
              onBackToList={onBackToList}
            />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
