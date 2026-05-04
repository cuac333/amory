import { useState, useEffect } from "react";
import ReactConfetti from "react-confetti";

export default function ConfettiExplosion() {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 6000);
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!show) return null;

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      numberOfPieces={300}
      recycle={false}
      colors={["#be185d", "#f472b6", "#d97706", "#fbbf24", "#ec4899", "#f43f5e"]}
    />
  );
}
