import React from 'react';

type MarkProps = { className?: string };

const MARKS: Record<string, () => React.ReactNode> = {
  bolt: () => (
    <path d="M13.8 2.1 5.7 13.35c-.4.55.02 1.3.7 1.3h5.25l-2.4 7.25c-.2.64.56 1.1 1.02.58l8.35-10.7c.44-.56.04-1.4-.7-1.4h-5.3L13.8 2.1Z" />
  ),
  spark: () => (
    <>
      <path d="M12 2.2 13.55 9.1 20.5 10.7 13.55 12.3 12 19.2 10.45 12.3 3.5 10.7 10.45 9.1 12 2.2Z" />
      <path d="M18.6 14.4 19.3 17.1 22 17.9 19.3 18.7 18.6 21.4 17.9 18.7 15.2 17.9 17.9 17.1 18.6 14.4Z" />
    </>
  ),
  star: () => (
    <path d="M12 2.3 14.85 8.6l6.95.7-5.2 4.7 1.55 6.8L12 17.5 5.85 20.8l1.55-6.8-5.2-4.7 6.95-.7L12 2.3Z" />
  ),
  trophy: () => (
    <>
      <path d="M7.2 4.2h9.6v3.4c0 2.85-2.15 5.15-4.8 5.15S7.2 10.45 7.2 7.6V4.2Z" />
      <path d="M7.2 6.1H4.7c-.55 0-1 .5-.95 1.05.35 2.05 1.7 3.45 3.5 3.9" />
      <path d="M16.8 6.1h2.5c.55 0 1 .5.95 1.05-.35 2.05-1.7 3.45-3.5 3.9" />
      <rect x="10.6" y="12.5" width="2.8" height="3.4" rx="0.8" />
      <rect x="7.4" y="17.8" width="9.2" height="2.4" rx="1.1" />
    </>
  ),
  crown: () => (
    <>
      <path d="M4.3 16.6 5.5 7.6 9.1 11.2 12 5.2l2.9 6 3.6-3.6 1.2 9Z" />
      <rect x="5" y="17.4" width="14" height="2.6" rx="1.1" />
    </>
  ),
  gem: () => <path d="M12 21 3.6 10.7 7.2 4.4h9.6L20.4 10.7 12 21Z" />,
  medal: () => (
    <>
      <path d="M8.2 2.6 12 7.2 15.8 2.6 17.4 8.4 6.6 8.4Z" />
      <circle cx="12" cy="14.4" r="6.4" />
      <circle cx="12" cy="14.4" r="3.1" fill="currentColor" />
    </>
  ),
  award: () => (
    <>
      <circle cx="12" cy="10.2" r="6.4" />
      <path d="M8.6 15.2 7 21.4 12 18.6 17 21.4 15.4 15.2" />
    </>
  ),
  target: () => (
    <path
      fillRule="evenodd"
      d="M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm0 3.3a6.3 6.3 0 1 0 0 12.6 6.3 6.3 0 0 0 0-12.6Zm0 3.3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 1.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"
    />
  ),
  check: () => (
    <path
      fillRule="evenodd"
      d="M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm4.35 6.55-6.1 6.2-2.6-2.55-1.7 1.7 4.3 4.25 7.8-7.9-1.7-1.7Z"
    />
  ),
  lock: () => (
    <>
      <path d="M8.1 10.2V8.1a3.9 3.9 0 0 1 7.8 0v2.1h1.7V8.1a5.6 5.6 0 0 0-11.2 0v2.1H8.1Z" />
      <rect x="5.4" y="10.1" width="13.2" height="10.6" rx="2.2" />
      <circle cx="12" cy="15.2" r="1.5" />
    </>
  ),
  gift: () => (
    <>
      <rect x="4.2" y="10.2" width="15.6" height="10.4" rx="1.6" />
      <rect x="3.6" y="7.4" width="16.8" height="3.4" rx="1.2" />
      <rect x="11" y="7.4" width="2" height="13.2" rx="0.6" />
      <path d="M12 7.4c-2.2-3.2-5.6-3.2-5.6-.4 0 1.8 2.4 2.6 5.6.4Z" />
      <path d="M12 7.4c2.2-3.2 5.6-3.2 5.6-.4 0 1.8-2.4 2.6-5.6.4Z" />
    </>
  ),
  gold: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path
        d="M12 7.1v9.8M9.6 9.2c.5-.9 1.5-1.4 2.4-1.4 1.15 0 2.05.6 2.05 1.7s-.85 1.5-2.15 1.8c-1.45.3-2.35.85-2.35 2.05 0 1.15 1.05 1.95 2.5 1.95 1.2 0 2.05-.5 2.45-1.5"
        fill="none"
        stroke="#FFD700"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </>
  ),
  fire: () => (
    <path d="M12.4 2.6s.2 3.4-2.2 5.8c-1.8 1.8-2.6 3.2-2.6 5.1 0 3.4 2.6 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.6-1.1-4.4-2.2-5.8-.7 1.6-1.7 2.3-1.7 2.3S17.4 6.4 12.4 2.6Z" />
  ),
  rocket: () => (
    <>
      <path d="M12 2.4c2.8 2.6 5.6 7.2 5.6 11.2 0 1.8-.5 3.2-1.3 4.2H7.7c-.8-1-1.3-2.4-1.3-4.2C6.4 9.6 9.2 5 12 2.4Z" />
      <path d="M7.4 15.2 4.6 20.2l4.2-1.4M16.6 15.2 19.4 20.2l-4.2-1.4" />
      <circle cx="12" cy="10.4" r="1.7" />
    </>
  ),
  muscle: () => (
    <>
      <rect x="3.6" y="10.4" width="16.8" height="2.4" rx="1.2" />
      <circle cx="6.4" cy="11.6" r="3.1" />
      <circle cx="17.6" cy="11.6" r="3.1" />
    </>
  ),
  brain: () => (
    <path d="M8.2 6.2c-2.2.4-3.6 2.4-3.6 4.6 0 1.4.6 2.6 1.5 3.4v3.2c0 1.2 1 2.2 2.2 2.2h.8V8.6c0-1.4.8-2.4 2.1-2.6-.4-1.2-1.7-1.8-3-1.8Zm7.6 0c-1.3 0-2.6.6-3 1.8 1.3.2 2.1 1.2 2.1 2.6v10h.8c1.2 0 2.2-1 2.2-2.2v-3.2c.9-.8 1.5-2 1.5-3.4 0-2.2-1.4-4.2-3.6-4.6Z" />
  ),
  runner: () => (
    <>
      <circle cx="15.4" cy="5.2" r="2.1" />
      <path d="M8.2 9.2 12.6 11l2.2 3.2 3.4-1.2 1.2 2.2-5.2 2.2-2.6-3.2-3.4 6.6-2.2-1.2 3.6-7.2-3.2-1.6Z" />
    </>
  ),
  hero: () => (
    <path d="M4.4 8.2 12 4.4l7.6 3.8v5.4c0 4.2-3.1 7.6-7.6 8.8-4.5-1.2-7.6-4.6-7.6-8.8V8.2Z" />
  ),
  shield: () => (
    <>
      <path d="M4.4 8.2 12 4.4l7.6 3.8v5.4c0 4.2-3.1 7.6-7.6 8.8-4.5-1.2-7.6-4.6-7.6-8.8V8.2Z" />
      <path d="M12 8.2 9.4 12.4h2.1l-.9 3.8 4.1-5.1h-2.1Z" fill="#FFD700" />
    </>
  ),
  heart: () => (
    <path d="M12 20.4 4.8 13.2C3 11.4 3 8.4 4.9 6.6c1.8-1.7 4.6-1.5 6.2.4L12 8.2l.9-1.2c1.6-1.9 4.4-2.1 6.2-.4 1.9 1.8 1.9 4.8.1 6.6L12 20.4Z" />
  ),
  calendar: () => (
    <>
      <rect x="4.2" y="5.6" width="15.6" height="14.6" rx="2" />
      <rect x="4.2" y="5.6" width="15.6" height="3.6" rx="2" />
      <rect x="7.2" y="3.4" width="1.8" height="3.6" rx="0.6" />
      <rect x="15" y="3.4" width="1.8" height="3.6" rx="0.6" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12.4" r="8.4" />
      <path d="M12 7.2v5.4l3.6 2.2" fill="none" stroke="#FFD700" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  sun: () => (
    <>
      <circle cx="12" cy="12" r="4.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect key={deg} x="11.15" y="1.8" width="1.7" height="3.4" rx="0.8" transform={`rotate(${deg} 12 12)`} />
      ))}
    </>
  ),
  sunset: () => (
    <>
      <path d="M5.2 14.6a6.8 6.8 0 0 1 13.6 0H5.2Z" />
      <rect x="3.2" y="15.4" width="17.6" height="2" rx="1" />
      <rect x="11.2" y="3.2" width="1.6" height="3" rx="0.8" />
    </>
  ),
  moon: () => (
    <path d="M13.2 3.4A8.7 8.7 0 1 0 20.4 14.6 7.1 7.1 0 0 1 13.2 3.4Z" />
  ),
  water: () => (
    <path d="M12 3.2c3.8 4.4 7.2 8.2 7.2 11.4A7.2 7.2 0 1 1 4.8 14.6C4.8 11.4 8.2 7.6 12 3.2Z" />
  ),
  wind: () => (
    <>
      <rect x="3.4" y="7.2" width="13.2" height="2" rx="1" />
      <rect x="3.4" y="11" width="17.2" height="2" rx="1" />
      <rect x="3.4" y="14.8" width="11.2" height="2" rx="1" />
    </>
  ),
  smile: () => (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="9.1" cy="10.2" r="1.25" fill="#FFD700" />
      <circle cx="14.9" cy="10.2" r="1.25" fill="#FFD700" />
      <path d="M8.4 13.8c.9 2.2 2.3 3.3 3.6 3.3s2.7-1.1 3.6-3.3" fill="none" stroke="#FFD700" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  folder: () => (
    <>
      <path d="M3.8 7.4h6.2l1.8 1.8h8.4c.9 0 1.6.7 1.6 1.6v8.2c0 .9-.7 1.6-1.6 1.6H3.8c-.9 0-1.6-.7-1.6-1.6V9c0-.9.7-1.6 1.6-1.6Z" />
    </>
  ),
  warning: () => (
    <path d="M12 3.2 21.4 20.2H2.6L12 3.2Zm0 6.2-.7 5.2h1.4L12 9.4Zm0 7.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" fillRule="evenodd" />
  ),
  gamepad: () => (
    <>
      <rect x="3.2" y="8.2" width="17.6" height="9.6" rx="4.4" />
      <path d="M7.4 11.2v4M5.4 13.2h4" stroke="#FFD700" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15.2" cy="12.1" r="1.05" fill="#FFD700" />
      <circle cx="17.4" cy="14.2" r="1.05" fill="#FFD700" />
    </>
  ),
  movie: () => (
    <>
      <rect x="3.6" y="7.2" width="16.8" height="11.4" rx="1.6" />
      <path d="M3.6 7.2 8.8 3.8h11.6L16.8 7.2" />
      <rect x="8.4" y="3.8" width="1.5" height="3.4" />
      <rect x="12.2" y="3.8" width="1.5" height="3.4" />
    </>
  ),
  tv: () => (
    <>
      <rect x="3.4" y="5.4" width="17.2" height="12.2" rx="2" />
      <rect x="9.2" y="17.6" width="5.6" height="1.6" rx="0.6" />
      <rect x="7.4" y="19.2" width="9.2" height="1.6" rx="0.6" />
    </>
  ),
  phone: () => <rect x="6.6" y="2.6" width="10.8" height="18.8" rx="2.4" />,
  headphones: () => (
    <>
      <path d="M5.4 13.2V12A6.6 6.6 0 0 1 18.6 12v1.2" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="3.6" y="12.4" width="3.6" height="6.8" rx="1.6" />
      <rect x="16.8" y="12.4" width="3.6" height="6.8" rx="1.6" />
    </>
  ),
  'ice-cream': () => (
    <>
      <path d="M7.2 10.6c0-2.8 2.1-5 4.8-5s4.8 2.2 4.8 5H7.2Z" />
      <path d="M8 10.6h8L12.4 21.2c-.2.5-1 .5-1.2 0L8 10.6Z" />
    </>
  ),
  cookie: () => (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="9.2" cy="9.6" r="1.15" fill="#FFD700" />
      <circle cx="14.6" cy="10.4" r="1.05" fill="#FFD700" />
      <circle cx="11.2" cy="14.6" r="1.2" fill="#FFD700" />
      <circle cx="15.2" cy="15.2" r="0.9" fill="#FFD700" />
    </>
  ),
  pizza: () => (
    <path d="M4.2 19.4 12 3.6 19.8 19.4H4.2Zm5.4-6.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4.2-3.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" fillRule="evenodd" />
  ),
  sandwich: () => (
    <>
      <rect x="3.6" y="6.4" width="16.8" height="3.2" rx="1.4" />
      <rect x="4.2" y="10.4" width="15.6" height="3.2" rx="1.2" />
      <rect x="3.6" y="14.4" width="16.8" height="3.2" rx="1.4" />
    </>
  ),
  candy: () => (
    <>
      <ellipse cx="12" cy="12" rx="5.3" ry="4.2" />
      <path d="M3.2 7.2 7.8 10.4v3.2L3.2 16.8 4.4 12 3.2 7.2ZM20.8 7.2 16.2 10.4v3.2l4.6 3.2L19.6 12l1.2-4.8Z" />
    </>
  ),
  park: () => (
    <>
      <path d="M12 3.2 18.8 14.6H5.2L12 3.2Z" />
      <rect x="10.8" y="14.2" width="2.4" height="6.4" rx="0.8" />
    </>
  ),
  swim: () => (
    <>
      <circle cx="8.4" cy="8.2" r="2" />
      <path d="M6.4 11.2h8.2l2.8 3.2H8.2Z" />
      <path d="M4.2 17.4c1.6-1 3.2-1 4.8 0s3.2 1 4.8 0 3.2-1 4.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  home: () => (
    <>
      <path d="M3.6 11.4 12 4.2l8.4 7.2v9.2H3.6V11.4Z" />
      <rect x="9.6" y="13.6" width="4.8" height="6.8" rx="0.8" fill="#FFD700" />
    </>
  ),
  beach: () => (
    <>
      <path d="M12.4 4.4c3.6 0 6.2 4.6 6.2 7.6H12.4V4.4Z" />
      <rect x="11.4" y="4.4" width="2" height="13.2" rx="0.8" />
      <rect x="4.2" y="18.2" width="15.6" height="2" rx="1" />
    </>
  ),
  plane: () => (
    <path d="M21 12 3.6 5.8v3.2L9.8 12 3.6 15v3.2L21 12Z" />
  ),
  car: () => (
    <>
      <path d="M5 14.2 7.2 9.2h9.6l2.2 5Z" />
      <rect x="3.4" y="13.8" width="17.2" height="4.4" rx="1.6" />
      <circle cx="7.4" cy="18.4" r="1.7" />
      <circle cx="16.6" cy="18.4" r="1.7" />
    </>
  ),
  bike: () => (
    <>
      <circle cx="6.4" cy="16.2" r="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="16.2" r="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6.4 16.2 11.2 9.2h4.4l2 7M11.2 9.2 8.4 16.2M13.4 6.6h3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  teddy: () => (
    <>
      <circle cx="6.6" cy="7.2" r="3.1" />
      <circle cx="17.4" cy="7.2" r="3.1" />
      <circle cx="12" cy="13.4" r="7.2" />
      <circle cx="9.4" cy="12.4" r="1.2" fill="#FFD700" />
      <circle cx="14.6" cy="12.4" r="1.2" fill="#FFD700" />
    </>
  ),
  book: () => (
    <>
      <path d="M5 4.4h6.2c.9 1.2 1.6 1.2 1.6 1.2s.7 0 1.6-1.2H20v15.2h-5.6s-1.1.8-2.4.8-2.4-.8-2.4-.8H5V4.4Z" />
      <path d="M12.8 5.6v13.4" stroke="#FFD700" strokeWidth="1.6" />
    </>
  ),
  art: () => (
    <>
      <path d="M12 3.2a8.8 8.8 0 1 0 3.2 16.9c.6.1.9-.6.5-1.1-1.1-1.3.2-2.4 1.5-3.4 2.6-2 2.6-5.6.2-8.2A8.7 8.7 0 0 0 12 3.2Z" />
      <circle cx="8.4" cy="10.2" r="1.15" fill="#FFD700" />
      <circle cx="12.2" cy="8.2" r="1.15" fill="#FFD700" />
      <circle cx="15.4" cy="11" r="1.15" fill="#FFD700" />
    </>
  ),
  soccer: () => <circle cx="12" cy="12" r="8.4" />,
  music: () => (
    <>
      <circle cx="7.2" cy="17.2" r="2.8" />
      <circle cx="16.4" cy="15.4" r="2.8" />
      <path d="M10 17.2V6.4l9.2-1.8v10.8" />
    </>
  ),
  mic: () => (
    <>
      <rect x="8.8" y="3.4" width="6.4" height="10.4" rx="3.2" />
      <path d="M7 12.2a5 5 0 0 0 10 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="11.1" y="16.8" width="1.8" height="3.8" rx="0.6" />
    </>
  ),
  theater: () => (
    <path d="M3.6 7.2h16.8l-1.6 11.4H5.2L3.6 7.2Zm3.2 3.2h2.2l.6 5.2H7.2l-.4-5.2Zm8.4 0h2.2l-.4 5.2h-2.4l.6-5.2Z" fillRule="evenodd" />
  ),
  circus: () => (
    <>
      <path d="M12 3.4 20.4 17.6H3.6L12 3.4Z" />
      <rect x="6.4" y="17.2" width="11.2" height="3.4" rx="0.8" />
    </>
  ),
  dice: () => (
    <>
      <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="2.4" />
      <circle cx="8.6" cy="8.6" r="1.15" fill="#FFD700" />
      <circle cx="15.4" cy="8.6" r="1.15" fill="#FFD700" />
      <circle cx="12" cy="12" r="1.15" fill="#FFD700" />
      <circle cx="8.6" cy="15.4" r="1.15" fill="#FFD700" />
      <circle cx="15.4" cy="15.4" r="1.15" fill="#FFD700" />
    </>
  ),
  lego: () => (
    <>
      <rect x="5.2" y="8.2" width="13.6" height="11.2" rx="1.4" />
      <rect x="7.2" y="5.2" width="3.6" height="3.6" rx="0.8" />
      <rect x="13.2" y="5.2" width="3.6" height="3.6" rx="0.8" />
    </>
  ),
  shirt: () => (
    <path d="M8.2 4.6 12 7.2 15.8 4.6 20.4 7.4 17.6 11v9.4H6.4V11L3.6 7.4 8.2 4.6Z" />
  ),
  sneaker: () => (
    <path d="M3.6 14.2c4.2-1.2 6.4-4.8 10.2-5.6 2.2-.5 4.2.4 6.6 1.8 1.2.7 1.8 2.2 1.8 3.6v1.6H3.6v-1.4Z" />
  ),
  party: () => (
    <>
      <path d="M6.2 18.6 12.8 5.4 17.8 18.6H6.2Z" />
      <circle cx="18.6" cy="6.4" r="1.1" />
      <circle cx="20.2" cy="10.2" r="0.9" />
      <circle cx="5.2" cy="8.2" r="1" />
    </>
  ),
  paint: () => (
    <>
      <path d="M14.6 3.8 20.2 9.4 11 18.6 5.4 13Z" />
      <path d="M5.4 13 3.8 20.2 11 18.6" />
    </>
  ),
  science: () => (
    <path d="M9.2 3.6h5.6v5.2l4.4 10.4H4.8L9.2 8.8V3.6Z" />
  ),
  city: () => (
    <>
      <rect x="4.2" y="10.2" width="4.6" height="10.2" rx="0.8" />
      <rect x="9.6" y="5.4" width="4.8" height="15" rx="0.8" />
      <rect x="15.2" y="8.2" width="4.6" height="12.2" rx="0.8" />
    </>
  ),
  glove: () => (
    <path d="M8.2 11V6.6a1.6 1.6 0 0 1 3.2 0V11M11.4 11V5.8a1.6 1.6 0 0 1 3.2 0V11M14.6 11.2V7.6a1.6 1.6 0 1 1 3.2.2c.8.4 1.4 1.4 1.4 2.6V16c0 2.6-2 4.6-4.6 4.6H9.2C6.8 20.6 5 18.6 5 16v-2.2c0-1.6 1.2-3 2.8-3.2z" />
  ),
  bell: () => (
    <>
      <path d="M6.4 16.2h11.2c0-2-.8-3.4-1.6-5-.6-1.4-.8-2.6-.8-4 0-2.2-1.8-4-4.2-4s-4.2 1.8-4.2 4c0 1.4-.2 2.6-.8 4-.8 1.6-1.6 3-1.6 5Z" />
      <path d="M10.2 18.6a1.8 1.8 0 0 0 3.6 0" />
    </>
  ),
  settings: () => (
    <>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect key={deg} x="10.6" y="2.3" width="2.8" height="5" rx="0.9" transform={`rotate(${deg} 12 12)`} />
      ))}
      <path fillRule="evenodd" d="M12 7.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2.5a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z" />
    </>
  ),
  notes: () => (
    <>
      <rect x="5" y="3.6" width="14" height="16.8" rx="2" />
      <rect x="7.6" y="7.4" width="8.8" height="1.5" rx="0.7" fill="#FFD700" />
      <rect x="7.6" y="11" width="8.8" height="1.5" rx="0.7" fill="#FFD700" />
      <rect x="7.6" y="14.6" width="5.6" height="1.5" rx="0.7" fill="#FFD700" />
    </>
  ),
  sign: () => (
    <>
      <rect x="10.6" y="15.6" width="2.8" height="5.4" rx="0.7" />
      <rect x="3.8" y="3.4" width="16.4" height="12.6" rx="1.6" />
      <rect x="6.2" y="6.6" width="11.6" height="1.7" rx="0.7" fill="#FFD700" />
      <rect x="6.2" y="10.2" width="8.4" height="1.7" rx="0.7" fill="#FFD700" />
    </>
  ),
  chart: () => (
    <>
      <rect x="4.4" y="12.4" width="4" height="7.4" rx="1" />
      <rect x="10" y="8.2" width="4" height="11.6" rx="1" />
      <rect x="15.6" y="4.8" width="4" height="15" rx="1" />
    </>
  ),
  wrench: () => (
    <path d="M14.8 4.2a4.6 4.6 0 0 0-5.8 5.8L3.6 15.4v5.2h5.2l5.4-5.4a4.6 4.6 0 0 0 5.8-5.8l-3.4 3.4-2.2-2.2 3.4-3.4Z" />
  ),
  history: () => (
    <>
      <circle cx="12.4" cy="13" r="7.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12.4 9.6v3.8l2.6 1.6M7.6 5.2 5 7.6 7.8 9.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cake: () => (
    <>
      <rect x="4.6" y="11.2" width="14.8" height="8.4" rx="1.6" />
      <path d="M6.4 11.2c1.4-2 3-2 4 0 1.4-2 3.2-2 4.2 0 1.2-2 3-2 3.8 0" />
      <rect x="11.2" y="4.2" width="1.6" height="3.4" rx="0.7" />
    </>
  ),
  volume: () => (
    <>
      <path d="M3.8 9.2h3.4L12 5.4v13.2L7.2 14.8H3.8V9.2Z" />
      <path d="M15.2 9.4c1.5 1.2 1.5 4 0 5.2M18 7.4c2.4 2 2.4 7.2 0 9.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  mute: () => (
    <>
      <path d="M3.8 9.2h3.4L12 5.4v13.2L7.2 14.8H3.8V9.2Z" />
      <path d="m15 9 5 6M20 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  play: () => <path d="M8 4.8v14.4L19.2 12 8 4.8Z" />,
  xp: () => (
    <path
      fillRule="evenodd"
      d="M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm2.9 5.5h2.05L14.15 12l2.8 4.1h-2.05L12 13.15 9.1 16.1H7.05L9.9 12 7.05 7.9H9.1L12 10.85 14.9 7.9Z"
    />
  ),
  logout: () => (
    <>
      <path d="M4.4 4.6h8.4v14.8H4.4V4.6Z" />
      <path d="M12.6 12h7.2M16.6 8.8 19.8 12 16.6 15.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function CartoonIcon({ name, className = 'w-5 h-5' }: MarkProps & { name: string }) {
  const mark = MARKS[name] || MARKS.star;
  return (
    <svg viewBox="0 0 24 24" className={`flash-mark ${className ?? ''}`} fill="currentColor" aria-hidden>
      {mark()}
    </svg>
  );
}

export function CartoonEmblem({
  name,
  size = 44,
  className = '',
  muted = false,
  tile = '#FFD700',
  mark = '#C8102E',
  title,
}: {
  name: string;
  size?: number;
  className?: string;
  muted?: boolean;
  tile?: string;
  mark?: string;
  title?: string;
}) {
  const content = (MARKS[name] || MARKS.star)();
  const brandTile = tile.toLowerCase() === '#c8102e';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`flash-mark ${muted ? 'icon-sticker-muted' : ''} ${className}`}
      aria-hidden={!title}
    >
      {title ? <title>{title}</title> : null}
      <rect x="4.5" y="5.5" width="40" height="40" rx="13" fill="#1A1214" />
      <rect x="2" y="2" width="40" height="40" rx="13" fill={tile} stroke="#1A1214" strokeWidth="2.8" />
      {brandTile && (
        <rect x="6.2" y="6.2" width="31.6" height="31.6" rx="10" fill="none" stroke="#FFD700" strokeWidth="1.7" />
      )}
      <ellipse cx="16" cy="12" rx="11" ry="5.5" fill="#fff" opacity="0.28" />
      <g transform="translate(10 10)" fill={mark}>
        {content}
      </g>
    </svg>
  );
}
