"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export interface PhotoStripItem {
  id: string;
  url: string;
  thumbnailBase64: string;
}

interface ShotPhotoStripLightboxProps {
  items: PhotoStripItem[];
  className?: string;
  title?: string | null;
  /** Thumbnail tile size in px (width & height). */
  thumbSize?: number;
  /** Per-thumbnail overlay (e.g. remove) — container is `relative` and thumb-sized. */
  renderThumbnailAccessory?: (item: PhotoStripItem, index: number) => ReactNode;
}

// ── Extracted lightbox: over 30-line conditional modal block ──────────────────

interface PhotoLightboxProps {
  items: PhotoStripItem[];
  open: boolean;
  openIndex: number;
  onOpenChange: (open: boolean) => void;
}

function PhotoLightbox({ items, open, openIndex, onOpenChange }: PhotoLightboxProps) {
  /**
   * Deferred to true only after the Dialog has fully opened and the container
   * has real dimensions — prevents Embla's "Cannot read properties of undefined
   * (reading 'isExpanded')" error when initializing inside an animating container.
   */
  const [lightboxReady, setLightboxReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(openIndex);
  const [lightboxApi, setLightboxApi] = useState<CarouselApi>();

  /** Sync counter label as user swipes — imperative API subscription. */
  useEffect(() => {
    if (!lightboxApi) return;
    const onSelect = () => setCurrentIndex(lightboxApi.selectedScrollSnap());
    lightboxApi.on("select", onSelect);
    return () => { lightboxApi.off("select", onSelect); };
  }, [lightboxApi]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex flex-col bg-black outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-label="Photo viewer"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // prevent Radix stealing focus from the carousel
            setCurrentIndex(openIndex);
            setLightboxReady(true);
          }}
          onCloseAutoFocus={() => setLightboxReady(false)}
        >
          <DialogPrimitive.Title className="sr-only">Photo viewer</DialogPrimitive.Title>

          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="text-sm tabular-nums text-white/70">
              {currentIndex + 1} / {items.length}
            </span>
            <DialogPrimitive.Close className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <XMarkIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Only mount Embla once the dialog has real dimensions.
              px-12 reserves space for the absolutely-positioned prev/next buttons
              which are placed at -left-12 / -right-12 by the Carousel component. */}
          <div className="flex-1 px-12">
            {lightboxReady && (
              <Carousel
                key={String(open)}
                opts={{ startIndex: openIndex, loop: items.length > 1 }}
                setApi={setLightboxApi}
              >
                <CarouselContent>
                  {items.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="flex items-center justify-center"
                      style={{ height: "calc(100dvh - 5rem)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt=""
                        className="max-h-full max-w-full select-none object-contain"
                        draggable={false}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {items.length > 1 && (
                  <>
                    <CarouselPrevious className="border-white/20 bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-20" />
                    <CarouselNext className="border-white/20 bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-20" />
                  </>
                )}
              </Carousel>
            )}
          </div>

          <div className="h-4 shrink-0" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ShotPhotoStripLightbox({
  items,
  className,
  title = "Photos",
  thumbSize = 96,
  renderThumbnailAccessory,
}: ShotPhotoStripLightboxProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);
  const openIndexRef = useRef(0);

  const openViewer = useCallback((index: number) => {
    openIndexRef.current = index;
    setOpenIndex(index);
    setViewerOpen(true);
  }, []);

  if (items.length === 0) return null;

  const thumbStyle = { width: thumbSize, height: thumbSize } as const;

  return (
    <div className={cn("space-y-3", className)}>
      {title ? (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
          {title}
        </h3>
      ) : null}

      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {items.map((item, i) => (
            <CarouselItem key={item.id} className="basis-auto pl-3">
              <div className="relative shrink-0" style={thumbStyle}>
                <button
                  type="button"
                  onClick={() => openViewer(i)}
                  className={cn(
                    "h-full w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm",
                    "transition-transform hover:scale-[1.03] hover:shadow-md",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
                    "dark:border-stone-600 dark:bg-stone-800",
                  )}
                  aria-label={`View photo ${i + 1} of ${items.length}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${item.thumbnailBase64}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                {renderThumbnailAccessory?.(item, i)}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <PhotoLightbox
        items={items}
        open={viewerOpen}
        openIndex={openIndex}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
