import React from "react";

export default function Spinner({ size = 32, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        style={{ animation: "spin 1s linear infinite" }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#16a34a"
          strokeWidth="5"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
