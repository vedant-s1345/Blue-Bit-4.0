/**
 * SpaceIntro.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Place this in:  src/components/SpaceIntro.jsx
 * Also place:     src/components/SpaceCity3D.jsx  (the file provided separately)
 *
 * This is just a thin wrapper. ALL visuals come from SpaceCity3D.jsx unchanged.
 * onEnter is called when the user clicks "USE FOR FREE".
 */

import SpaceCity3D from './SpaceCity3D'

export default function SpaceIntro({ onEnter }) {
  return <SpaceCity3D onEnter={onEnter} />
}
