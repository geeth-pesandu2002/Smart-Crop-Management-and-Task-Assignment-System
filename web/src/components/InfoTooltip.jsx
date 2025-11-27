import React from "react";

export default function InfoTooltip({ text }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          display: "inline-block",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#e0e7ef",
          color: "#2563eb",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: "18px",
          fontSize: 13,
          cursor: "pointer",
          marginLeft: 6,
        }}
        tabIndex={0}
        title={text}
      >
        i
      </span>
    </span>
  );
}
