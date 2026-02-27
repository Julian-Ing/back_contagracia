'use client';

import { useEffect, useState } from 'react';

const ADMIN_API_URL =
  process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002/api';

export function TrackingScripts() {
  const [scripts, setScripts] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/site-settings/metadata`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tracking_scripts) {
          setScripts(data.tracking_scripts);
        }
      })
      .catch(() => {
        // Silently fail — tracking is non-critical
      });
  }, []);

  useEffect(() => {
    if (!scripts) return;

    try {
      const container = document.createElement('div');
      container.innerHTML = scripts;

      // Process <script> tags
      const scriptElements = container.querySelectorAll('script');
      scriptElements.forEach((original) => {
        const script = document.createElement('script');

        // Copy attributes (src, async, defer, type, etc.)
        Array.from(original.attributes).forEach((attr) => {
          script.setAttribute(attr.name, attr.value);
        });

        // Copy inline content
        if (original.textContent) {
          script.textContent = original.textContent;
        }

        document.head.appendChild(script);
      });

      // Process <noscript> tags
      const noscriptElements = container.querySelectorAll('noscript');
      noscriptElements.forEach((original) => {
        const noscript = document.createElement('noscript');
        noscript.innerHTML = original.innerHTML;
        document.head.appendChild(noscript);
      });
    } catch {
      console.warn('[TrackingScripts] Error processing tracking scripts');
    }
  }, [scripts]);

  return null;
}
