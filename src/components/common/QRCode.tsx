"use client";

import { useState, useEffect } from "react";

interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

/**
 * QR Code component using qr-server.com API
 * Generates a QR code for the given URL
 */
export function QRCode({ url, size = 256, className = "" }: QRCodeProps) {
  const [error, setError] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

  // Validate URL
  useEffect(() => {
    try {
      new URL(url);
      setError(false);
    } catch {
      setError(true);
    }
  }, [url]);

  if (error || !url) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800 ${className}`}
        style={{ width: size, height: size }}
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Invalid URL
        </p>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={qrUrl}
        alt={`QR code for ${url}`}
        className="rounded-lg border border-stone-200 dark:border-stone-700"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    </div>
  );
}
