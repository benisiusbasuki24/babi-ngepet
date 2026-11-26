import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Octagonal Heritage Stamp Frame */}
      <polygon
        points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20"
        fill="#171615"
        stroke="#C83E2B"
        strokeWidth="2.5"
      />
      <polygon
        points="22,8.5 42,8.5 55.5,22 55.5,42 42,55.5 22,55.5 8.5,42 8.5,22"
        fill="none"
        stroke="#D99B26"
        strokeWidth="1.2"
        strokeOpacity="0.65"
      />

      {/* Flame-Coin Folklore Accent */}
      <path
        d="M32 11.5C34.2 14.2 35.4 16.3 34.8 18.6C34.2 20.6 32.8 21.5 32 21.5C31.2 21.5 29.8 20.6 29.2 18.6C28.6 16.3 29.8 14.2 32 11.5Z"
        fill="#D99B26"
      />

      {/* Stylized Boar / Pig Ears */}
      <path d="M16 26L23 20L25 28L16 26Z" fill="#C83E2B" />
      <path d="M48 26L41 20L39 28L48 26Z" fill="#C83E2B" />

      {/* Head Silhouette */}
      <ellipse cx="32" cy="34" rx="15" ry="13.5" fill="#F8F7F4" />

      {/* Heritage Headband Knot */}
      <path
        d="M19.5 27.5C24 25 40 25 44.5 27.5"
        stroke="#C83E2B"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <circle cx="25.5" cy="32.5" r="2" fill="#171615" />
      <circle cx="38.5" cy="32.5" r="2" fill="#171615" />

      {/* Snout */}
      <ellipse cx="32" cy="39.5" rx="7.2" ry="5" fill="#C83E2B" />
      <circle cx="29.3" cy="39.5" r="1.4" fill="#171615" />
      <circle cx="34.7" cy="39.5" r="1.4" fill="#171615" />

      {/* Signature Tusks */}
      <path
        d="M22.5 41.5C20.5 40.5 19.5 38.5 20.3 36.8C21.2 38.6 22.4 39.4 24.2 39.6"
        fill="#D99B26"
      />
      <path
        d="M41.5 41.5C43.5 40.5 44.5 38.5 43.7 36.8C42.8 38.6 41.6 39.4 39.8 39.6"
        fill="#D99B26"
      />
    </svg>
  );
};
