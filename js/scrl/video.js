'use strict';
/*
 * js/scrl/video.js — panorama pan video via canvas.captureStream + MediaRecorder
 * DI-free pure module; vanilla JS, zero deps. Chrome primary.
 * Spec 10.2 Option A: 1080x1350 video canvas, per-frame drawImage pan slice with linear panX.
 */

export const VID_W = 1080;
export const VID_H = 1350;

export function getSupportedVideoMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
  const cands = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const c of cands) {
    try { if (MediaRecorder.isTypeSupported(c)) return c; } catch (_) {}
  }
  return null;
}

export function getVideoFileExt(mime) {
  if (!mime) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  return 'webm';
}

export function canRecordVideo() {
  try {
    const c = document.createElement('canvas');
    const hasCapture = typeof c.captureStream === 'function';
    const hasRecorder = typeof window.MediaRecorder !== 'undefined';
    if (!hasCapture || !hasRecorder) return false;
    return !!getSupportedVideoMimeType();
  } catch (_) { return false; }
}

/**
 * exportPanoramaVideo(panCanvas, opts) -> Promise<Blob>
 * panCanvas: already-rendered panorama canvas at 1x (W = N*1080, H=1350)
 * opts: {duration: 6|9|12, fps: 30, direction: 'ltr'|'rtl', onProgress?: (p 0..1)=>void}
 * Uses 1080x1350 video canvas, linear panX 0->W-1080, captureStream(fps) + MediaRecorder.
 * No audio. Throws if not supported.
 */
export async function exportPanoramaVideo(panCanvas, opts = {}) {
  if (!panCanvas || typeof panCanvas.width !== 'number' || typeof panCanvas.height !== 'number') throw new Error('panCanvas required');
  const duration = opts.duration === 9 ? 9 : opts.duration === 12 ? 12 : 6;
  const fps = Math.max(1, Math.min(60, Math.round(opts.fps || 30)));
  const direction = opts.direction === 'rtl' ? 'rtl' : 'ltr';
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

  const maxPan = Math.max(0, panCanvas.width - VID_W);
  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) throw new Error('No supported video mime');
  if (typeof window.MediaRecorder === 'undefined') throw new Error('MediaRecorder not available');

  const vid = document.createElement('canvas');
  vid.width = VID_W;
  vid.height = VID_H;
  const vctx = vid.getContext('2d');
  if (!vctx) throw new Error('Canvas 2D not available');
  if (typeof vid.captureStream !== 'function') throw new Error('captureStream not supported');

  const stream = vid.captureStream(fps);
  const chunks = [];
  let rec;
  try {
    rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
  } catch (e) {
    // retry without bitrate if mime rejected
    rec = new MediaRecorder(stream, { mimeType });
  }
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

  const done = new Promise((resolve, reject) => {
    rec.onstop = () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      if (!chunks.length) reject(new Error('No data recorded'));
      else resolve(new Blob(chunks, { type: mimeType }));
    };
    rec.onerror = e => reject((e && e.error) || new Error('MediaRecorder error'));
  });

  // initial frame before start so capture has content
  vctx.drawImage(panCanvas, direction === 'rtl' ? maxPan : 0, 0, VID_W, VID_H, 0, 0, VID_W, VID_H);
  rec.start(100);
  const start = performance.now();
  const totalMs = duration * 1000;

  return new Promise((resolve, reject) => {
    done.then(resolve).catch(reject);
    function frame(now) {
      const ts = typeof now === 'number' ? now : performance.now();
      const elapsed = ts - start;
      const p = Math.min(elapsed / totalMs, 1);
      const panX = direction === 'rtl' ? maxPan * (1 - p) : maxPan * p;
      const sx = Math.max(0, Math.min(maxPan, Math.round(panX)));
      // 9-arg integer source rect
      vctx.drawImage(panCanvas, sx, 0, VID_W, VID_H, 0, 0, VID_W, VID_H);
      if (onProgress) try { onProgress(p); } catch (_) {}
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(() => { try { if (rec.state === 'recording') rec.stop(); } catch (e) { reject(e); } }, 220);
      }
    }
    requestAnimationFrame(frame);
    // safety timeout
    setTimeout(() => { try { if (rec.state === 'recording') rec.stop(); } catch (_) {} }, totalMs + 2000);
  });
}

// ponytail: no ffmpeg.wasm; upgrade path noted in spec 10.2 future H.264 via wasm if needed.
// minimal self-check (no framework)
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
  console.assert(getVideoFileExt('video/mp4;codecs=avc1') === 'mp4', 'mp4 ext');
  console.assert(getVideoFileExt('video/webm;codecs=vp9') === 'webm', 'webm ext');
}
