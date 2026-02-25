import { useRef, useState, useEffect, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityContext } from '../CityContext.js';
import { findNearestOreDeposit, canMineOre, ORE_REQUIRED_LEVEL } from '../../systems/oreRegistry.js';
import {
  usePlacementTracker,
  StorageBadge,
  WorkAreaOverlay,
  LevelBadge,
  LevelRing,
  memo,
  buildingPropsEqual,
} from '../SharedUI.jsx';
import { ConveyorSourceRing } from '../ConveyorBelt.jsx';
import { EXTRACTOR_CONFIG } from '../../items/extractor.js';
import { getLevelConfig } from '../../systems/upgrades.js';
import { Html } from '@react-three/drei';
import { FaExclamationTriangle, FaCog, FaCheck, FaCircle } from 'react-icons/fa';

// ─── Ore-type label shown above the extractor ─────────────────────────────────

function OreBadge({ level, badgeHeight, oreType }) {
  const conf   = getLevelConfig('extractor', level);
  const accent = conf?.accentColor ?? '#a8874a';
  const name   = conf?.oreType ?? 'Руда';
  const rate   = Math.round(3 * (conf?.rateMultiplier ?? 1) * 10) / 10;

  const activelyMines = oreType ? canMineOre(level, oreType) : true;
  const reqLevel      = oreType ? (ORE_REQUIRED_LEVEL[oreType] ?? 1) : null;

  return (
    <Html
      position={[0, badgeHeight, 0]}
      center
      distanceFactor={35}
      zIndexRange={[10, 11]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.88)',
        border:       `1px solid ${accent}50`,
        borderTop:    `2px solid ${accent}`,
        borderRadius: 8,
        padding:      '3px 10px',
        fontSize:     12,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        accent,
        whiteSpace:   'nowrap',
        userSelect:   'none',
      }}>
        <FaCircle style={{ color: accent, verticalAlign: 'middle', marginRight: 4, fontSize: 8 }} />{name} · {rate} ед./ч
        {oreType && !activelyMines && (
          <div style={{ color: '#f87171', fontSize: 10, fontWeight: 600, marginTop: 2 }}>
            <FaExclamationTriangle style={{ marginRight: 3, verticalAlign: 'middle' }} /> Требует ур.{reqLevel} для {oreType}
          </div>
        )}
        {oreType && activelyMines && (
          <div style={{ color: '#4ade80', fontSize: 10, fontWeight: 600, marginTop: 2 }}>
            <FaCheck style={{ marginRight: 3, verticalAlign: 'middle' }} /> Добывает: {oreType}
          </div>
        )}
      </div>
    </Html>
  );
}

// ─── Upgrade-in-progress badge ────────────────────────────────────────────────

function UpgradeProgressBadge({ upgradeInfo, badgeHeight }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!upgradeInfo) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [upgradeInfo]); // eslint-disable-line
  if (!upgradeInfo) return null;
  const now      = Date.now();
  const progress = Math.min(1, (now - upgradeInfo.startReal) / upgradeInfo.durationMs);
  const pct      = Math.round(progress * 100);
  const secLeft  = Math.max(0, Math.ceil((upgradeInfo.startReal + upgradeInfo.durationMs - now) / 1000));
  return (
    <Html
      position={[0, badgeHeight + 5.0, 0]}
      center
      distanceFactor={35}
      zIndexRange={[12, 13]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background:   'rgba(0,0,0,0.92)',
        border:       '1px solid rgba(251,191,36,0.5)',
        borderTop:    '2px solid #fbbf24',
        borderRadius: 8,
        padding:      '4px 12px',
        fontSize:     11,
        fontFamily:   'monospace',
        fontWeight:   700,
        color:        '#fbbf24',
        whiteSpace:   'nowrap',
        minWidth:     110,
        userSelect:   'none',
      }}>
        <FaCog style={{ marginRight: 4, verticalAlign: 'middle', fontSize: 11 }} /> Улучшение {pct}% ({secLeft}с)
        <div style={{ height: 4, background: '#374151', borderRadius: 3, marginTop: 3 }}>
          <div style={{
            height:       '100%',
            width:        `${pct}%`,
            background:   '#fbbf24',
            borderRadius: 3,
            transition:   'width 0.9s',
          }} />
        </div>
      </div>
    </Html>
  );
}

// ─── Procedural extractor body ────────────────────────────────────────────────

export function ExtractorBody({
  emissiveColor,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  accentOverride,
  animating = true,
}) {
  const drillRef  = useRef();
  const gearRef   = useRef();
  const lightRef  = useRef();

  useFrame(({ clock }) => {
    if (!animating) return;
    const t = clock.getElapsedTime();
    if (drillRef.current)  drillRef.current.rotation.y  =  t * 3.5;
    if (gearRef.current)   gearRef.current.rotation.z   = -t * 2.2;
    if (lightRef.current) {
      lightRef.current.material.emissiveIntensity =
        emissiveIntensity + 0.5 + Math.sin(t * 2.5) * 0.3;
    }
  });

  const m   = { transparent, opacity };
  const ec  = emissiveColor ?? '#000000';
  const ei  = emissiveIntensity;
  const acc = accentOverride ?? '#a8874a';

  return (
    <group position={[0, 0, 0]}>
      {/* Ground platform / base slab */}
      <mesh receiveShadow castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[4.2, 0.36, 4.2]} />
        <meshStandardMaterial color="#374151" roughness={0.85} metalness={0.3}
          emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>

      {/* Main housing box */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[2.8, 2.2, 2.8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.7} metalness={0.45}
          emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>

      {/* Front panel */}
      <mesh position={[0, 1.5, 1.42]}>
        <boxGeometry args={[2.6, 1.8, 0.08]} />
        <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.5}
          emissive={new THREE.Color(acc)} emissiveIntensity={ei * 0.5 + 0.04} {...m} />
      </mesh>

      {/* Accent LED strip on front */}
      <mesh ref={lightRef} position={[0, 2.3, 1.43]}>
        <boxGeometry args={[2.0, 0.12, 0.06]} />
        <meshStandardMaterial color={acc} emissive={new THREE.Color(acc)}
          emissiveIntensity={ei + 0.5} roughness={0.2} metalness={0.1} {...m} />
      </mesh>

      {/* Side accent stripes */}
      {[-1.41, 1.41].map((xz, i) => (
        <mesh key={i} position={[xz, 1.5, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <boxGeometry args={[2.6, 0.1, 0.06]} />
          <meshStandardMaterial color={acc} emissive={new THREE.Color(acc)}
            emissiveIntensity={ei * 0.4 + 0.12} roughness={0.3} metalness={0.1} {...m} />
        </mesh>
      ))}

      {/* Drill shaft tower */}
      <mesh castShadow position={[0, 3.3, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 1.6, 8]} />
        <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.7}
          emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.3} {...m} />
      </mesh>

      {/* Rotating drill bit top */}
      <group ref={drillRef} position={[0, 4.1, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.32, 0.9, 6]} />
          <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.8}
            emissive={new THREE.Color(acc)} emissiveIntensity={ei * 0.5 + 0.08} {...m} />
        </mesh>
        {/* Drill fins */}
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((ry, i) => (
          <mesh key={i} rotation={[0, ry, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.6, 0.55]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.8} {...m} />
          </mesh>
        ))}
      </group>

      {/* Gear decoration on top of housing */}
      <group ref={gearRef} position={[1.0, 2.65, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.35, 0.09, 5, 10]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.9}
            emissive={new THREE.Color(acc)} emissiveIntensity={ei * 0.3 + 0.05} {...m} />
        </mesh>
      </group>

      {/* Ore storage bin (side hopper) */}
      <mesh castShadow position={[2.2, 0.85, 0]}>
        <boxGeometry args={[1.2, 1.4, 1.8]} />
        <meshStandardMaterial color="#374151" roughness={0.9} metalness={0.2}
          emissive={new THREE.Color(ec)} emissiveIntensity={ei * 0.2} {...m} />
      </mesh>
      {/* Bin opening top */}
      <mesh position={[2.2, 1.58, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.0, 0.08, 1.6]} />
        <meshStandardMaterial color={acc} emissive={new THREE.Color(acc)}
          emissiveIntensity={ei * 0.6 + 0.1} roughness={0.2} metalness={0.1} {...m} />
      </mesh>
      {/* Ore pile inside bin (visual fill) */}
      <mesh position={[2.2, 1.0, 0]}>
        <sphereGeometry args={[0.42, 8, 6]} />
        <meshStandardMaterial color={acc} emissive={new THREE.Color(acc)}
          emissiveIntensity={ei * 0.4 + 0.15} roughness={0.8} metalness={0.1} {...m} />
      </mesh>

      {/* Conveyor chute connecting housing to bin */}
      <mesh castShadow position={[1.55, 1.2, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.45, 0.7, 0.55]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} metalness={0.4} {...m} />
      </mesh>
    </group>
  );
}

// ─── Preview (placement ghost) ────────────────────────────────────────────────

function ExtractorPreviewInner({ placementPosRef, inputRef, placementRotYRef }) {
  const { groupRef, blockedRef } = usePlacementTracker(placementPosRef, inputRef, placementRotYRef);
  const matRef     = useRef();
  const coneMat    = useRef();
  const noOreRef   = useRef(true);
  const hintDivRef = useRef(null);

  useFrame(({ clock }) => {
    const pos = placementPosRef.current;
    if (pos) {
      const nearOre    = findNearestOreDeposit(pos.x, pos.z);
      noOreRef.current = !nearOre;
      if (!nearOre) blockedRef.current = true; // force blocked – not on ore
      // Update hint via direct DOM mutation (avoids React re-render overhead)
      if (hintDivRef.current) {
        if (!nearOre) {
          hintDivRef.current.textContent = '! Только на руду';
          hintDivRef.current.style.color = '#f87171';
        } else {
          hintDivRef.current.textContent = nearOre.name;
          hintDivRef.current.style.color = '#4ade80';
        }
      }
    }
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.35;
    // green = valid ore spot, orange = ore but collision, red = no ore
    const col = noOreRef.current
      ? 0xcc0000        // red – no ore deposit nearby
      : blockedRef.current
        ? 0xff6600     // orange – on ore but collision
        : 0x00bb44;    // green – valid placement
    if (matRef.current) {
      matRef.current.emissive.setHex(col);
      matRef.current.emissiveIntensity = pulse * 0.6;
    }
    if (coneMat.current) {
      coneMat.current.emissive.setHex(col);
      coneMat.current.emissiveIntensity = pulse * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Simplified ghost preview */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[3.5, 2.4, 3.5]} />
        <meshStandardMaterial
          ref={matRef}
          color="#92400e"
          emissive={new THREE.Color(0x00bb44)}
          emissiveIntensity={0.5}
          transparent
          opacity={0.75}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[0.4, 1.2, 6]} />
        <meshStandardMaterial ref={coneMat} color="#a16207" transparent opacity={0.75}
          emissive={new THREE.Color(0x00bb44)} emissiveIntensity={0.5} />
      </mesh>
      {/* Placement hint: which ore / warning */}
      <Html position={[0, 5.5, 0]} center distanceFactor={28} zIndexRange={[10, 11]} style={{ pointerEvents: 'none' }}>
        <div
          ref={hintDivRef}
          style={{
            background:   'rgba(0,0,0,0.82)',
            border:       '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding:      '2px 10px',
            fontSize:     12,
            fontFamily:   'monospace',
            fontWeight:   700,
            color:        '#f87171',
            whiteSpace:   'nowrap',
            userSelect:   'none',
          }}
        ><FaExclamationTriangle style={{ marginRight: 4, verticalAlign: 'middle' }} /> Только на руду</div>
      </Html>
    </group>
  );
}

// ─── Placed building ──────────────────────────────────────────────────────────

function ExtractorGLTFPlaced({
  position,
  rotation,
  isSelected,
  onSelect,
  onConveyorClick,
  isConveyorSource,
  onRightClick,
  currentAmounts = {},
  level = 1,
  oreType,       // ore deposit type the extractor is sitting on
  upgradeInfo,   // { startReal, durationMs, targetLevel } or null
}) {
  const { placedHitRef, conveyorModeRef, rightClickHitRef } = useContext(CityContext);
  const lvlConf = getLevelConfig('extractor', level);
  const scale   = 1 + (lvlConf?.scaleBonus ?? 0);
  const accent  = lvlConf?.accentColor ?? '#a8874a';
  const glow    = lvlConf?.glowIntensity ?? 0;

  return (
    <group
      position={[position[0], 0, position[2]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button === 2) {
          rightClickHitRef.current = true;
          onRightClick?.(e.nativeEvent.clientX, e.nativeEvent.clientY);
          return;
        }
        placedHitRef.current = true;
        if (conveyorModeRef.current) { onConveyorClick?.(); }
        else                         { onSelect?.(); }
      }}
    >
      <group rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]}>
        <ExtractorBody
          accentOverride={accent}
          emissiveColor={accent}
          emissiveIntensity={glow}
        />
      </group>

      {/* Floating ore type + rate badge (shows capability warning if ore ≠ level) */}
      <OreBadge level={level} badgeHeight={EXTRACTOR_CONFIG.badgeHeight} oreType={oreType} />

      {/* Upgrade in progress badge */}
      <UpgradeProgressBadge upgradeInfo={upgradeInfo} badgeHeight={EXTRACTOR_CONFIG.badgeHeight} />

      {/* Ore storage amount badge */}
      <StorageBadge
        itemType="extractor"
        badgeHeight={EXTRACTOR_CONFIG.badgeHeight + 2.5}
        currentAmounts={currentAmounts}
        level={level}
      />

      <LevelBadge level={level} height={EXTRACTOR_CONFIG.badgeHeight + 5} />
      <LevelRing  level={level} radius={3} />
      {isConveyorSource && <ConveyorSourceRing />}

      {isSelected && (
        <WorkAreaOverlay
          width={EXTRACTOR_CONFIG.workArea.width}
          depth={EXTRACTOR_CONFIG.workArea.depth}
          color={EXTRACTOR_CONFIG.workArea.color}
          opacity={EXTRACTOR_CONFIG.workArea.opacity}
        />
      )}
    </group>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function ExtractorPreview({ placementPosRef, inputRef, placementRotYRef }) {
  return (
    <ExtractorPreviewInner
      placementPosRef={placementPosRef}
      inputRef={inputRef}
      placementRotYRef={placementRotYRef}
    />
  );
}

export const ExtractorPlaced = memo(
  function ExtractorPlacedBase(props) {
    return <ExtractorGLTFPlaced {...props} />;
  },
  buildingPropsEqual,
);
