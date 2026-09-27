import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS necesita un PNG para el icono de "Anadir a pantalla de inicio". */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#6c5ce7',
          color: '#ffffff',
          fontSize: 92,
          fontWeight: 700,
        }}
      >
        AE
      </div>
    ),
    size
  );
}
