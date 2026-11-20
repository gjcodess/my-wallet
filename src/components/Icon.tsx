import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function Icon({
  name,
  size = 20,
  color = "#121a2d",
  strokeWidth = 1.9,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const renderPaths = () => {
    switch (name) {
      case "home":
        return (
          <>
            <Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
            <Path d="M9.5 20.5V15h5v5.5" />
          </>
        );
      case "wallet":
        return (
          <>
            <Path d="M4.5 6h14A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A2.5 2.5 0 0 1 6.5 4H17" />
            <Path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" />
          </>
        );
      case "activity":
        return <Path d="M5 19V11M10 19V5M15 19v-6M20 19V8" />;
      case "settings":
        return (
          <>
            <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <Circle cx="16" cy="7" r="2" />
            <Circle cx="8" cy="17" r="2" />
          </>
        );
      case "eye":
        return (
          <>
            <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <Circle cx="12" cy="12" r="2.5" />
          </>
        );
      case "eye-off":
        return (
          <Path d="m3 3 18 18M10.7 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.7M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.3 9.3 0 0 0 3-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        );
      case "plus":
        return <Path d="M12 5v14M5 12h14" />;
      case "swap":
        return (
          <>
            <Path d="M5 8h14M15.5 4.8 19 8l-3.5 3.2" />
            <Path d="M19 16H5M8.5 12.8 5 16l3.5 3.2" />
          </>
        );
      case "arrow-down":
        return <Path d="M12 4v15M6 13l6 6 6-6" />;
      case "arrow-up":
        return <Path d="M12 20V5M6 11l6-6 6 6" />;
      case "arrow-out":
        return <Path d="M7 17 17 7M8 7h9v9" />;
      case "chevron":
        return <Path d="m9 5 7 7-7 7" />;
      case "down":
        return <Path d="m6 9 6 6 6-6" />;
      case "back":
        return <Path d="m15 5-7 7 7 7" />;
      case "more":
        return (
          <>
            <Circle cx="5" cy="12" r="1.2" fill={color} />
            <Circle cx="12" cy="12" r="1.2" fill={color} />
            <Circle cx="19" cy="12" r="1.2" fill={color} />
          </>
        );
      case "close":
        return <Path d="m6 6 12 12M18 6 6 18" />;
      case "check":
        return <Path d="m5 12 4.2 4.2L19 6.5" />;
      case "sun":
        return (
          <>
            <Circle cx="12" cy="12" r="4" />
            <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        );
      case "moon":
        return <Path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />;
      case "lock":
        return (
          <>
            <Rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
            <Path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
          </>
        );
      case "shield":
        return (
          <Path d="M12 3 19.5 6v5.5c0 4.7-3.2 7.9-7.5 9.5-4.3-1.6-7.5-4.8-7.5-9.5V6Z" />
        );
      case "cloud":
        return (
          <Path d="M6.5 18a4 4 0 0 1-.4-8A6 6 0 0 1 17.8 9.4 4.3 4.3 0 0 1 17.5 18Z" />
        );
      case "info":
        return (
          <>
            <Circle cx="12" cy="12" r="8.5" />
            <Path d="M12 11v5M12 8v.2" />
          </>
        );
      case "bag":
        return (
          <>
            <Path d="M5.5 8h13l-1 12.5h-11Z" />
            <Path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
          </>
        );
      case "adjust":
        return <Path d="M5 12h14M12 5v14" />;
      case "cup":
        return (
          <Path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
        );
      case "bolt":
        return <Path d="m13 2-7.5 12h6l-1 8L18 10h-6Z" />;
      case "car":
        return (
          <>
            <Path d="M5 16h14l-1.4-5.2A2.5 2.5 0 0 0 15.2 9H8.8a2.5 2.5 0 0 0-2.4 1.8Z" />
            <Path d="M4 16v3h3v-3M17 16v3h3v-3M7.5 13h.1M16.5 13h.1" />
          </>
        );
      case "briefcase":
        return (
          <>
            <Rect x="3.5" y="7" width="17" height="12" rx="2.5" />
            <Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12h17" />
          </>
        );
      case "gift":
        return (
          <>
            <Rect x="4" y="9" width="16" height="11" rx="2" />
            <Path d="M3.5 9h17v4h-17ZM12 9v11M12 9H8.5a2 2 0 1 1 2-3.2L12 9Zm0 0h3.5a2 2 0 1 0-2-3.2L12 9Z" />
          </>
        );
      case "heart":
        return (
          <Path d="M20.5 8.5c0 5-8.5 10.5-8.5 10.5S3.5 13.5 3.5 8.5A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8.5 2.5Z" />
        );
      case "search":
        return (
          <>
            <Circle cx="10.5" cy="10.5" r="6.5" />
            <Path d="m16 16 4 4" />
          </>
        );
      case "edit":
        return (
          <>
            <Path d="m14 5 5 5-9.5 9.5H4.5v-5Z" />
            <Path d="m12 7 5 5" />
          </>
        );
      case "grid":
        return (
          <>
            <Rect x="4" y="4" width="6" height="6" rx="1.5" />
            <Rect x="14" y="4" width="6" height="6" rx="1.5" />
            <Rect x="4" y="14" width="6" height="6" rx="1.5" />
            <Rect x="14" y="14" width="6" height="6" rx="1.5" />
          </>
        );
      case "bank":
        return (
          <Path d="m3 9 9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
        );
      case "phone":
        return (
          <>
            <Rect x="7" y="2.5" width="10" height="19" rx="2.5" />
            <Path d="M11 18.5h2" />
          </>
        );
      case "cash":
        return (
          <>
            <Rect x="3" y="6" width="18" height="12" rx="2" />
            <Circle cx="12" cy="12" r="2.5" />
            <Path d="M6.5 9v.1M17.5 15v.1" />
          </>
        );
      case "sync":
        return (
          <>
            <Path d="M20 7v5h-5M4 17v-5h5" />
            <Path d="M18.5 12A6.5 6.5 0 0 0 6.7 8M5.5 12a6.5 6.5 0 0 0 11.8 4" />
          </>
        );
      case "grip":
        return (
          <>
            <Circle cx="9" cy="6.5" r="1.2" fill={color} />
            <Circle cx="15" cy="6.5" r="1.2" fill={color} />
            <Circle cx="9" cy="12" r="1.2" fill={color} />
            <Circle cx="15" cy="12" r="1.2" fill={color} />
            <Circle cx="9" cy="17.5" r="1.2" fill={color} />
            <Circle cx="15" cy="17.5" r="1.2" fill={color} />
          </>
        );
      case "backspace":
        return (
          <>
            <Path d="M20 6H9l-6 6 6 6h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 20 6Z" />
            <Path d="m11.5 9.5 5 5M16.5 9.5l-5 5" />
          </>
        );
      case "fingerprint":
        return (
          <>
            <Path d="M12 11a1.5 1.5 0 0 1 1.5 1.5c0 2.2-.5 4.2-1.5 6" />
            <Path d="M8.5 11.5A3.5 3.5 0 0 1 15.5 12c0 2.8-.6 5-1.6 7" />
            <Path d="M6 12a6 6 0 0 1 12 0c0 2-.3 4-.9 5.8" />
            <Path d="M4.2 9.8A8.5 8.5 0 0 1 19.8 9.8" />
            <Path d="M8.5 16.5c.3-1.1.5-2.3.5-3.5" />
          </>
        );
      case "cart":
        return (
          <>
            <Path d="M3 4.5h2.2l2 9.5h10.5l2-6.5H6.2" />
            <Circle cx="9" cy="18.5" r="1.5" />
            <Circle cx="16.5" cy="18.5" r="1.5" />
          </>
        );
      case "wifi":
        return (
          <>
            <Path d="M3.5 9.5a12.5 12.5 0 0 1 17 0" />
            <Path d="M6.8 13a8 8 0 0 1 10.4 0" />
            <Path d="M10.1 16.5a3.5 3.5 0 0 1 3.8 0" />
            <Circle cx="12" cy="19.5" r="1" fill={color} />
          </>
        );
      case "film":
        return (
          <>
            <Rect x="3.5" y="5" width="17" height="14" rx="2.5" />
            <Path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" />
          </>
        );
      case "book":
        return (
          <>
            <Path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v16.5H7a2.5 2.5 0 0 0-2.5 2.5Z" />
            <Path d="M4.5 5.5v14.5M8.5 7.5h7M8.5 11h5" />
          </>
        );
      case "users":
        return (
          <>
            <Circle cx="9" cy="8.5" r="3" />
            <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <Circle cx="16.5" cy="9.5" r="2.3" />
            <Path d="M15.5 19h5a4 4 0 0 0-3.5-4" />
          </>
        );
      case "trend":
        return (
          <>
            <Path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" />
            <Path d="M15 7.5h5.5V13" />
          </>
        );
      case "tag":
        return (
          <>
            <Path d="M4 12V5.5A1.5 1.5 0 0 1 5.5 4H12l8 8-6.5 6.5Z" />
            <Circle cx="8.5" cy="8.5" r="1.2" fill={color} />
          </>
        );
      case "card":
        return (
          <>
            <Rect x="3" y="5.5" width="18" height="13" rx="2.5" />
            <Path d="M3 10h18M7 14.5h3.5" />
          </>
        );
      case "star":
        return (
          <Path d="m12 3.5 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8Z" />
        );
      case "palette":
        return (
          <>
            <Path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
            <Circle cx="7.5" cy="11.5" r="1" fill={color} />
            <Circle cx="10.5" cy="7.5" r="1" fill={color} />
            <Circle cx="15" cy="8.5" r="1" fill={color} />
          </>
        );
      default:
        return <Circle cx="12" cy="12" r="6" />;
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderPaths()}
    </Svg>
  );
}
