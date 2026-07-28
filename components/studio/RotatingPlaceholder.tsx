"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  "Quiero crear una plataforma para descubrir ayudas públicas.",
  "Quiero crear un marketplace de cuidadores.",
  "Quiero crear un ERP para constructoras.",
  "Quiero crear una app para reducir el desperdicio alimentario.",
  "Quiero crear un SaaS para clínicas dentales.",
];

export function RotatingPlaceholder() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % EXAMPLES.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="rotating-placeholder"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        color: "var(--fhis-color-text-muted)",
      }}
    >
      {EXAMPLES[index]}
    </span>
  );
}
