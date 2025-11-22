import React, { useRef, useEffect } from 'react';

interface ClusterNode {
  dx: number;
  dy: number;
  size: number;
  opacityOffset: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  twinkleSpeed: number;
  clusterNodes?: ClusterNode[];
}

interface Connection {
  startIdx: number;
  endIdx: number;
  life: number;     // 0.0 to 1.0
  state: 'growing' | 'holding' | 'fading';
  maxLife: number;
}

interface PlanetPoint {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  noise: number; // For surface texture/variation
}

const PlanetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const starsRef = useRef<Star[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const planetPointsRef = useRef<PlanetPoint[]>([]);
  const requestRef = useRef<number>(0);
  
  // Interaction state
  const mouseRef = useRef({ x: 0, y: 0 });
  // Camera look-at state for smooth interpolation
  const lookAtRef = useRef({ x: 0, y: 0 });
  
  const zoomRef = useRef(1);
  const targetZoomRef = useRef(1);
  const lastTouchDistRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  const initStars = (width: number, height: number) => {
    // Optimize star count based on screen area
    // Mobile screens get fewer stars for performance and clarity
    // Large desktops get more for density
    const area = width * height;
    const starCount = Math.min(2500, Math.max(600, Math.floor(area / 350))); 

    const stars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      // Distribute Z from near (0.2) to far (4.0)
      const z = Math.random() * 3.8 + 0.2;
      
      // Frustum distribution: Spread X/Y proportional to Z
      // This ensures stars fill the screen angle regardless of depth
      const spreadFactor = 1.5 * z; 
      const x = (Math.random() - 0.5) * width * spreadFactor;
      const y = (Math.random() - 0.5) * height * spreadFactor;

      // Determine if this star is actually a cluster
      let clusterNodes: ClusterNode[] | undefined;
      // 4% chance to be a cluster
      if (Math.random() < 0.04) {
          clusterNodes = [];
          const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 stars in a cluster
          const clusterSpread = 40; // Local spread units
          for(let k=0; k<count; k++) {
             clusterNodes.push({
                 dx: (Math.random() - 0.5) * clusterSpread,
                 dy: (Math.random() - 0.5) * clusterSpread,
                 size: Math.random() * 0.8 + 0.3,
                 opacityOffset: Math.random()
             });
          }
      }

      stars.push({
        x,
        y,
        z, 
        size: Math.random() * 1.5 + 0.5,
        baseOpacity: Math.random() * 0.5 + 0.3,
        opacity: Math.random(), // Start with random cycle
        twinkleSpeed: (Math.random() * 0.01 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        clusterNodes
      });
    }
    starsRef.current = stars;
  };

  const initPlanet = (width: number, height: number) => {
    const points: PlanetPoint[] = [];
    const numPoints = 1400; 
    
    // Planet size: ~30% of the smallest screen dimension
    const minDim = Math.min(width, height);
    const radius = minDim * 0.30; 
    
    // Fibonacci Sphere Algorithm
    const phi = Math.PI * (3 - Math.sqrt(5)); 

    for (let i = 0; i < numPoints; i++) {
        const y = 1 - (i / (numPoints - 1)) * 2; 
        const r = Math.sqrt(1 - y * y); 
        const theta = phi * i;

        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        points.push({
            x: x * radius,
            y: y * radius,
            z: z * radius,
            baseX: x * radius,
            baseY: y * radius,
            baseZ: z * radius,
            noise: Math.random() // random value for texture variation
        });
    }
    planetPointsRef.current = points;
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smooth Zoom Interpolation
    zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.1;
    const zoom = zoomRef.current;

    // Planet Rotation
    rotationRef.current += 0.002;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center calculations
    const cx = canvas.width / 2;
    // Portrait Adjustment: Move center up slightly to avoid bottom UI
    const isPortrait = canvas.height > canvas.width;
    const cy = canvas.height / 2 - (isPortrait ? canvas.height * 0.1 : 0);
    
    // Smooth Parallax: Lerp current LookAt towards target Mouse position
    const targetLookX = (mouseRef.current.x - cx) * 0.05;
    const targetLookY = (mouseRef.current.y - cy) * 0.05;

    lookAtRef.current.x += (targetLookX - lookAtRef.current.x) * 0.05;
    lookAtRef.current.y += (targetLookY - lookAtRef.current.y) * 0.05;

    // Organic Camera Bobbing (Breathing effect)
    // Creates a subtle floating sensation
    const bobX = Math.sin(time * 0.001) * 12;
    const bobY = Math.cos(time * 0.0013) * 12;

    const offsetX = lookAtRef.current.x + bobX;
    const offsetY = lookAtRef.current.y + bobY;

    // --- ATMOSPHERE GLOW ---
    // Calculate visual radius of the planet
    const minDim = Math.min(canvas.width, canvas.height);
    const planetPhysicalRadius = minDim * 0.30;
    const planetZ = 1.6; 
    const scaleAtCenter = zoom / planetZ;
    const visualRadius = planetPhysicalRadius * scaleAtCenter;
    
    // Only draw glow if it's somewhat visible
    if (visualRadius > 0) {
        const glowSize = visualRadius * 1.3; // Glow extends beyond surface
        
        // Center the glow behind the planet
        const glowX = cx + offsetX * scaleAtCenter;
        const glowY = cy + offsetY * scaleAtCenter;

        const gradient = ctx.createRadialGradient(glowX, glowY, visualRadius * 0.9, glowX, glowY, glowSize);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)'); // Very subtle inner cyan
        gradient.addColorStop(0.6, 'rgba(99, 102, 241, 0.02)'); // Faint indigo
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Use simple source-over blending
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(glowX, glowY, glowSize, 0, Math.PI * 2);
        ctx.fill();
    }


    // --- DRAW PLANET (Textured 3D Globe) ---
    const cosRot = Math.cos(rotationRef.current);
    const sinRot = Math.sin(rotationRef.current);
    
    // Interaction Radius for mouse hover effect
    const hoverRadius = Math.max(100, Math.min(250, minDim * 0.2));

    planetPointsRef.current.forEach(p => {
        // Rotate around Y axis
        const rotX = p.baseX * cosRot - p.baseZ * sinRot;
        const rotZ = p.baseX * sinRot + p.baseZ * cosRot;
        const rotY = p.baseY; 

        // 3D Projection
        const scale = zoom / (planetZ + rotZ * 0.001); 
        
        const x = cx + (rotX + offsetX) * scale;
        const y = cy + (rotY + offsetY) * scale;

        // Depth & Noise Shading
        const isBack = rotZ > 0;
        // Make back points slightly visible to give volume, but dimmer
        const baseAlpha = isBack ? 0.15 : 0.85;
        
        // Apply noise texture: vary alpha by +/- 30% based on noise value
        const noiseMod = 0.7 + (p.noise * 0.6); 
        let finalAlpha = baseAlpha * noiseMod;
        let dotSize = (isBack ? 0.9 : 1.3) * scale * 0.8; 

        // --- MOUSE INTERACTION ---
        const dx = x - mouseRef.current.x;
        const dy = y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hoverRadius) {
            const intensity = Math.pow(1 - dist / hoverRadius, 2);
            
            // Effect: Brighten and slightly enlarge points near mouse
            finalAlpha = Math.min(1, finalAlpha + intensity * 0.6);
            dotSize += intensity * 1.5;
            
            if (intensity > 0.5) {
                 ctx.fillStyle = `rgba(220, 250, 255, ${finalAlpha})`;
            } else {
                 ctx.fillStyle = `rgba(6, 182, 212, ${finalAlpha})`;
            }
        } else {
             ctx.fillStyle = `rgba(6, 182, 212, ${finalAlpha})`;
        }
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, dotSize), 0, Math.PI * 2);
        ctx.fill();
    });


    // --- STARS & CONNECTIONS ---
    const stars = starsRef.current;
    const driftSpeed = 0.002; 

    stars.forEach(star => {
        // Move stars towards camera
        star.z -= driftSpeed;
        
        // Infinite Looping: Recycling
        // When star gets too close (z <= 0.2), reset it to the back (z = 4.0)
        if (star.z <= 0.2) {
            star.z = 4.0; 
            
            // Re-distribute smoothly in the frustum
            const spreadFactor = 1.5 * star.z;
            const w = canvas.width;
            const h = canvas.height;
            
            star.x = (Math.random() - 0.5) * w * spreadFactor;
            star.y = (Math.random() - 0.5) * h * spreadFactor;
            
            // Reset opacity properties for a smooth fade-in
            star.opacity = 0; 
        }
    });

    // --- Update & Draw Connections ---
    if (stars.length > 0 && Math.random() < 0.03) {
      const startIdx = Math.floor(Math.random() * stars.length);
      const startStar = stars[startIdx];
      
      if (startStar && startStar.z < 3.0 && startStar.z > 0.5) {
        let bestDist = Infinity;
        let bestIdx = -1;
        
        for(let i=0; i<20; i++) {
          const checkIdx = Math.floor(Math.random() * stars.length);
          if(checkIdx === startIdx) continue;
          
          const s2 = stars[checkIdx];
          // Safety check if s2 exists
          if (!s2) continue;

          const dx = (startStar.x - s2.x);
          const dy = (startStar.y - s2.y);
          const dist = dx*dx + dy*dy;
          
          if(dist < 50000 * startStar.z && dist < bestDist && Math.abs(startStar.z - s2.z) < 0.5) {
              bestDist = dist;
              bestIdx = checkIdx;
          }
        }

        if (bestIdx !== -1) {
          connectionsRef.current.push({
            startIdx,
            endIdx: bestIdx,
            life: 0,
            state: 'growing',
            maxLife: Math.random() * 0.4 + 0.6
          });
        }
      }
    }

    ctx.globalCompositeOperation = 'screen'; 
    
    for (let i = connectionsRef.current.length - 1; i >= 0; i--) {
      const conn = connectionsRef.current[i];
      
      if (conn.state === 'growing') {
        conn.life += 0.04;
        if (conn.life >= conn.maxLife) conn.state = 'holding';
      } else if (conn.state === 'holding') {
        conn.life -= 0.005;
        if (conn.life < conn.maxLife * 0.8) conn.state = 'fading';
      } else {
        conn.life -= 0.015;
      }

      if (conn.life <= 0) {
        connectionsRef.current.splice(i, 1);
        continue;
      }

      const s1 = stars[conn.startIdx];
      const s2 = stars[conn.endIdx];

      // FIX: Ensure stars exist before accessing properties
      // Resize events can invalidate indices
      if (!s1 || !s2) {
          connectionsRef.current.splice(i, 1);
          continue;
      }

      const scale1 = zoom / s1.z;
      const x1 = cx + (s1.x + offsetX) * scale1;
      const y1 = cy + (s1.y + offsetY) * scale1;

      const scale2 = zoom / s2.z;
      const x2 = cx + (s2.x + offsetX) * scale2;
      const y2 = cy + (s2.y + offsetY) * scale2;

      if (x1 < -50 || x1 > canvas.width + 50 || y1 < -50 || y1 > canvas.height + 50) continue;

      const baseWidth = 0.5 + (conn.life * 1.5); 
      ctx.lineWidth = baseWidth * (zoom * 0.5);

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      const alpha = conn.life * 0.6;
      
      gradient.addColorStop(0, `rgba(99, 102, 241, 0)`);
      gradient.addColorStop(0.2, `rgba(139, 92, 246, ${alpha})`); 
      gradient.addColorStop(0.8, `rgba(6, 182, 212, ${alpha})`); 
      gradient.addColorStop(1, `rgba(6, 182, 212, 0)`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';


    // --- DRAW STARS ---
    stars.forEach(star => {
      // Twinkle
      star.opacity += star.twinkleSpeed;
      if (star.opacity > 1 || star.opacity < 0.2) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }

      const scale = zoom / star.z;
      const x = cx + (star.x + offsetX) * scale;
      const y = cy + (star.y + offsetY) * scale;

      if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) return;

      let renderSize = star.size * scale * 0.8;
      renderSize = Math.max(0.5, renderSize);

      // Depth Fading:
      // 1. Distance dimming: Further stars are dimmer
      const depthIntensity = Math.min(1, 1.5 / (star.z * star.z)); 
      
      // 2. Near-plane Fading: Smooth fade out as star hits camera
      const nearFade = Math.min(1, Math.max(0, (star.z - 0.2) * 5)); 

      const alpha = Math.max(0, Math.min(1, star.opacity * star.baseOpacity * depthIntensity * nearFade));
      
      let colorString;
      if (star.z > 2.5) {
        colorString = `rgba(100, 130, 200, ${alpha * 0.6})`; 
      } else if (star.z > 1.2) {
        colorString = `rgba(180, 210, 255, ${alpha * 0.8})`; 
      } else {
        colorString = `rgba(255, 255, 255, ${alpha})`; 
      }

      // Star Glow (Only for close stars that aren't fading out yet)
      if (depthIntensity > 0.8 && zoom > 1.0 && nearFade > 0.8) {
        const glowSize = renderSize * (4 + (zoom * 0.5));
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Main Star
      ctx.fillStyle = colorString;
      ctx.beginPath();
      ctx.arc(x, y, renderSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw Cluster Nodes
      if (star.clusterNodes) {
        star.clusterNodes.forEach(node => {
             const nx = cx + (star.x + node.dx + offsetX) * scale;
             const ny = cy + (star.y + node.dy + offsetY) * scale;
             const nSize = node.size * scale * 0.8;
             let nOpacity = (star.opacity + node.opacityOffset);
             if (nOpacity > 1) nOpacity -= 1; 
             const nAlpha = Math.max(0, Math.min(1, nOpacity * star.baseOpacity * depthIntensity * nearFade));
             
             ctx.fillStyle = `rgba(255, 255, 255, ${nAlpha})`;
             ctx.beginPath();
             ctx.arc(nx, ny, Math.max(0.3, nSize), 0, Math.PI * 2);
             ctx.fill();
        });
      }
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        
        // Center mouse initially
        mouseRef.current = { x: clientWidth / 2, y: clientHeight / 2 };
        
        initStars(clientWidth, clientHeight);
        // Reset connections on resize because star indices become invalid
        connectionsRef.current = [];
        
        initPlanet(clientWidth, clientHeight);
      }
    };
    
    handleResize();
    
    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        targetZoomRef.current = Math.max(0.5, Math.min(5.0, targetZoomRef.current + delta));
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            mouseRef.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastTouchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();

        if (e.touches.length === 1) {
            const t = e.touches[0];
            mouseRef.current = { x: t.clientX, y: t.clientY };
        } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const deltaDist = dist - lastTouchDistRef.current;
            
            // Increased sensitivity for touch zoom
            const zoomSensitivity = 0.008;
            targetZoomRef.current = Math.max(0.5, Math.min(5.0, targetZoomRef.current + deltaDist * zoomSensitivity));
            
            lastTouchDistRef.current = dist;
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistRef.current = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};

export default PlanetCanvas;