"use client";

import { useMemo, useRef, useEffect, useState, forwardRef } from "react";
import { QRCode as QRCodeLogo } from "react-qrcode-logo";

type EyeRadius = [number, number, number, number];
type EyeRadiusWithInner = {
  outer: EyeRadius;
  inner: EyeRadius;
};

type QRCodeProps = {
  value: string;
  title?: string;
  size?: number;
  logoImage?: string;
  className?: string;
  forceLight?: boolean;
  customFgColor?: string;
  customBgColor?: string;
};

/**
 * Fluid QR Code component with responsive sizing and theme-aware colors
 * Generates a QR code with dot-style modules and styled round corner eyes
 */
export const QRCode = forwardRef<HTMLDivElement, QRCodeProps>(function QRCode(
  {
    value,
    title,
    size,
    logoImage,
    className,
    forceLight = false,
    customFgColor,
    customBgColor,
  },
  ref
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);

  // Merge external ref with internal ref using callback ref
  const setRef = (node: HTMLDivElement | null) => {
    internalRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  const containerRef = internalRef;

  // Validate value
  useEffect(() => {
    if (typeof window === "undefined") {
      setMounted(true);
      return;
    }

    try {
      // Try to validate as URL if it looks like one
      if (value && (value.startsWith("http://") || value.startsWith("https://"))) {
        new URL(value);
        setError(false);
      } else if (value && value.trim() !== "") {
        // Allow non-URL values (like recipe data)
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      // If it's not a URL but has content, it's valid
      if (value && value.trim() !== "") {
        setError(false);
      } else {
        setError(true);
      }
    }
    setMounted(true);
  }, [value]);

  // Detect if className contains any width or height variants (w-*, h-*)
  const hasWidthClass = className?.match(/\bw-[\w/]+/)?.[0];
  const hasHeightClass = className?.match(/\bh-[\w/]+/)?.[0];
  const isResponsive = !!(hasWidthClass || hasHeightClass);

  const [dynamicSize, setDynamicSize] = useState(size || 317);

  // Calculate size from container dimensions when using width/height classes (responsive mode)
  useEffect(() => {
    if (!isResponsive || !containerRef.current) {
      // If not responsive, use provided size or default
      if (size !== undefined) {
        setDynamicSize(size);
      }
      return;
    }

    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        // Account for padding (p-6 = 1.5rem = 24px on each side = 48px total)
        const padding = 48;
        const availableWidth = containerWidth - padding;
        const availableHeight = containerHeight - padding;

        // Use the smaller dimension to maintain square aspect ratio for QR code
        // If only one dimension is constrained, use that one
        let calculatedSize: number;
        if (hasWidthClass && hasHeightClass) {
          // Both width and height are constrained - use the smaller dimension
          calculatedSize = Math.min(availableWidth, availableHeight);
        } else if (hasWidthClass) {
          // Only width is constrained
          calculatedSize = availableWidth;
        } else {
          // Only height is constrained
          calculatedSize = availableHeight;
        }

        setDynamicSize(Math.max(100, calculatedSize));
      }
    };

    // Initial size calculation
    updateSize();

    // Use ResizeObserver for responsive updates
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [size, isResponsive, hasWidthClass, hasHeightClass]);

  const finalSize = isResponsive ? dynamicSize : size ?? 317;

  // Compute colors during render (avoid useEffect for derived values)
  const { fgColor, bgColor } = useMemo(() => {
    // If custom colors are provided, use them directly
    if (customFgColor && customBgColor) {
      return {
        fgColor: customFgColor,
        bgColor: customBgColor,
      };
    }

    if (typeof window === "undefined") {
      // SSR fallback
      return { fgColor: "#171717", bgColor: "#ffffff" };
    }

    const root = document.documentElement;

    // Get CSS variables
    const foreground = getComputedStyle(root)
      .getPropertyValue("--foreground")
      .trim();
    const background = getComputedStyle(root)
      .getPropertyValue("--background")
      .trim();

    if (forceLight) {
      // Always render in light mode regardless of active theme
      return {
        fgColor: foreground || "#171717",
        bgColor: background || "#ffffff",
      };
    }

    // Detect dark mode via media query
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (isDark) {
      // Dark mode: QR code should be light on dark background
      return {
        fgColor: foreground || "#ededed",
        bgColor: background || "#0a0a0a",
      };
    } else {
      // Light mode: QR code should be dark on light background
      return {
        fgColor: foreground || "#171717",
        bgColor: background || "#ffffff",
      };
    }
  }, [forceLight, customFgColor, customBgColor]);

  // Eye radius configuration — rounded corners on the three position detection patterns
  // See: https://github.com/gcoro/react-qrcode-logo/blob/HEAD/res/eyeRadius_doc.md
  const eyeRadius0: EyeRadiusWithInner = {
    outer: [45, 45, 45, 45],
    inner: [5, 5, 5, 5],
  };
  const eyeRadius1: EyeRadiusWithInner = {
    outer: [45, 45, 45, 45],
    inner: [5, 5, 5, 5],
  };
  const eyeRadius2: EyeRadiusWithInner = {
    outer: [45, 45, 45, 45],
    inner: [5, 5, 5, 5],
  };

  // Don't render QR code if value is empty or invalid
  if (!mounted) {
    return (
      <div
        ref={setRef}
        className={`flex items-center justify-center p-6 ${className || ""}`}
        style={{
          borderRadius: 55,
        }}
      />
    );
  }

  if (error || !value || value.trim() === "") {
    return (
      <div
        ref={setRef}
        className={`flex items-center justify-center p-6 ${className || ""}`}
        style={{
          backgroundColor: bgColor,
          borderRadius: 55,
        }}
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {title ? `${title} - Invalid` : "Invalid QR code"}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className={`flex items-center justify-center p-6 ${className || ""}`}
      style={{
        backgroundColor: bgColor,
        borderRadius: 55,
      }}
    >
      <QRCodeLogo
        value={value}
        size={finalSize}
        qrStyle="dots"
        eyeRadius={[eyeRadius0, eyeRadius1, eyeRadius2]}
        fgColor={fgColor}
        bgColor={bgColor}
        ecLevel="M"
        quietZone={0}
        eyeColor={{
          outer: fgColor,
          inner: fgColor,
        }}
        logoImage={logoImage}
        logoWidth={logoImage ? 159 : 0}
        logoHeight={logoImage ? 159 : 0}
        logoOpacity={logoImage ? 0.5 : 1}
        logoPadding={0}
        removeQrCodeBehindLogo={!!logoImage}
      />
    </div>
  );
});
