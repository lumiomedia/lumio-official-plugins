'use client'

import { BACKDROP_PHONE_OPACITY, BACKDROP_SCRIM, BACKDROP_SCRIM_PHONE, SPORT_GRADIENTS, backdropSrc, type BackdropChoice } from './backdrop'

/** Ligger bakom hela Sport-vyn. Tar aldrig fokus eller klick. */
export function SportBackdropLayer({ choice, phone, onBroken }: { choice: BackdropChoice; phone: boolean; onBroken(url: string): void }) {
  if (choice.kind === 'none') return null
  const image = choice.kind === 'image' ? choice : null
  const src = image ? backdropSrc(image) : null
  return (
    <div
      data-testid="sport-backdrop"
      data-backdrop={image ? image.from : 'gradient'}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: choice.kind === 'gradient' ? SPORT_GRADIENTS[choice.sport] : '#000' }}
    >
      {image && src ? (
        <>
          <img src={src} alt="" decoding="async" onError={() => onBroken(image.url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: phone ? 'center top' : 'center 30%', ...(phone ? { opacity: BACKDROP_PHONE_OPACITY } : {}) }} />
          <div data-scrim="" style={{ position: 'absolute', inset: 0, backgroundImage: phone ? BACKDROP_SCRIM_PHONE : BACKDROP_SCRIM }} />
        </>
      ) : null}
    </div>
  )
}
