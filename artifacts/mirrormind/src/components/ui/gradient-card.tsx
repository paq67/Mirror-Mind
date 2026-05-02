'use client'
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

interface GradientCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GradientCard = ({ children, className = '' }: GradientCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setRotation({
        x: -(y / rect.height) * 5,
        y: (x / rect.width) * 5
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-[24px] overflow-hidden ${className}`}
      style={{
        transformStyle: "preserve-3d",
        backgroundColor: "#0e131f",
        boxShadow: "0 -10px 100px 10px rgba(78, 99, 255, 0.15), 0 0 10px 0 rgba(0,0,0,0.5)",
      }}
      animate={{
        y: isHovered ? -4 : 0,
        rotateX: rotation.x,
        rotateY: rotation.y,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Glass reflection */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%)" }}
      />
      {/* Dark base */}
      <div className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(180deg, #0a0d18 0%, #000000 100%)" }}
      />
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay z-10 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />
      {/* Purple/blue bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 z-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at bottom right, rgba(172,92,255,0.5) -10%, rgba(79,70,229,0) 70%),
                       radial-gradient(ellipse at bottom left, rgba(56,189,248,0.5) -10%, rgba(79,70,229,0) 70%)`,
          filter: "blur(40px)",
        }}
      />
      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] z-25 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.02) 100%)",
          boxShadow: "0 0 15px 3px rgba(172,92,255,0.6), 0 0 25px 5px rgba(56,189,248,0.3)",
        }}
      />
      {/* Content */}
      <div className="relative z-40 p-6">
        {children}
      </div>
    </motion.div>
  );
};
