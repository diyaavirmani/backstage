"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

// Block sizes in CSS pixels, coarse to fine; the real image replaces the
// canvas after the last step.
const BLOCKS = [72, 48, 32, 20, 12, 6, 3];
const STEP_MS = 100;

// next/image that reveals itself as a stepped mosaic when it scrolls into
// view. The canvas only reads the already-downloaded image (same origin), so
// there is no extra network cost. Without JavaScript the image shows normally
// (see the <noscript> rule in the root layout).
export function PixelImage({ className = "", alt, ...props }: ImageProps) {
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const img = image.current,
      cv = canvas.current;
    if (!img || !cv) return;
    // Disarms the CSS failsafe that would otherwise show the image after a
    // few seconds (covers failed hydration).
    img.dataset.pixel = "armed";
    let timer = 0,
      cancelled = false,
      started = false;
    const finish = () => {
      if (!cancelled) setRevealed(true);
    };
    const play = () => {
      if (started || cancelled) return;
      started = true;
      const ctx = cv.getContext("2d");
      const w = img.clientWidth,
        h = img.clientHeight;
      if (!ctx || !w || !h || !img.naturalWidth) return finish();
      const style = getComputedStyle(img);
      Object.assign(cv.style, {
        left: `${img.offsetLeft}px`,
        top: `${img.offsetTop}px`,
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: style.borderRadius,
        zIndex: style.zIndex,
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      // Match object-fit: cover cropping so the mosaic lines up with the image.
      const nw = img.naturalWidth,
        nh = img.naturalHeight;
      let sx = 0,
        sy = 0,
        sw = nw,
        sh = nh;
      if (style.objectFit === "cover") {
        const scale = Math.max(w / nw, h / nh);
        sw = w / scale;
        sh = h / scale;
        const [px, py] = style.objectPosition
          .split(" ")
          .map((value) => (value.endsWith("%") ? parseFloat(value) / 100 : 0.5));
        sx = (nw - sw) * (px ?? 0.5);
        sy = (nh - sh) * (py ?? 0.5);
      }
      const small = document.createElement("canvas");
      const sctx = small.getContext("2d");
      if (!sctx) return finish();
      let index = 0;
      const step = () => {
        if (cancelled) return;
        if (index >= BLOCKS.length) return finish();
        const block = BLOCKS[index++];
        small.width = Math.max(1, Math.round(w / block));
        small.height = Math.max(1, Math.round(h / block));
        sctx.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(small, 0, 0, cv.width, cv.height);
        cv.style.opacity = "1";
        timer = window.setTimeout(step, STEP_MS);
      };
      step();
    };
    const whenLoaded = () => {
      if (img.complete && img.naturalWidth) play();
      else {
        img.addEventListener("load", play, { once: true });
        img.addEventListener("error", finish, { once: true });
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          whenLoaded();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(img);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      img.removeEventListener("load", play);
      img.removeEventListener("error", finish);
    };
  }, []);

  return (
    <>
      <Image
        {...props}
        alt={alt}
        ref={image}
        className={`pixel-img${revealed ? " is-revealed" : ""} ${className}`}
      />
      {!revealed && (
        <canvas ref={canvas} className="pixel-canvas" aria-hidden="true" />
      )}
    </>
  );
}
