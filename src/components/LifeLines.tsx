"use client";

import { useEffect, useState } from "react";
import { family, events, START_YEAR, END_YEAR, type FamilyMember } from "@/lib/family";

const WIDTH = 560;
const HEIGHT = 996;
const HEAD_Y = 242;
const PIXELS_PER_YEAR = 19;

const YEARS = END_YEAR - START_YEAR;
const END_HOLD = 6;
const TOTAL_DURATION = YEARS + END_HOLD;
const OLA_ENTRANCE_YEAR = 2007;

const ADRIAN = family.find((person) => person.id === "adrian")!;
const OLA = family.find((person) => person.id === "ola")!;

// Delikatne ziarenka w tle, bez losowania podczas renderowania.
const SPECKS = Array.from({ length: 85 }, (_, i) => ({
  x: 10 + ((i * 83.73) % 540),
  y: 12 + ((i * 149.39) % 970),
  r: i % 7 === 0 ? 1.1 : 0.65,
  opacity: 0.12 + (i % 4) * 0.035,
}));

type Point = {
  x: number;
  y: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function ease(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

const WAVE_AMPLITUDE = 4;
const WAVE_SPEED = 0.55;

function getFloatingX(
  person: FamilyMember,
  year: number,
  visualYear: number,
  motionTime: number,
): number {
  const lastYear = Math.min(visualYear, person.died ?? visualYear);
  const distance = Math.max(0, lastYear - year);

  // Falowanie narasta stopniowo poniżej punktu osoby.
  const strength = ease(distance / 3);

  // Każda linia ma własną, delikatnie przesuniętą falę.
  // Po śmierci osoby zatrzymujemy falowanie jej linii.
  // Sama linia nadal przesuwa się w dół razem z historią.
  const deathTime = person.died !== undefined ? person.died - START_YEAR : Infinity;

  const waveTime = Math.min(motionTime, deathTime);

  const phase = distance * 0.2 - waveTime * WAVE_SPEED + person.born * 0.12;

  const wave = Math.sin(phase) * WAVE_AMPLITUDE * strength;

  return getX(person, year) + wave;
}

// Uklad pokoleniowy: kazde pokolenie ma wlasna wysokosc.
// Po 2007 roku rozsuwa sie miejsce dla Oli, a od 2015 dla dzieci.
function getX(person: FamilyMember, year: number): number {
  const partner = ease((year - OLA_ENTRANCE_YEAR) / 5);
  const parenthood = ease((year - events.nikoBorn) / 2);
  const siblings = ease((year - 2018.2) / 1.8);
  const drift = Math.sin((year - START_YEAR) * 0.13 + person.born * 0.21) * 1.1;

  switch (person.id) {
    case "urszula":
      return 45 - partner * 13 + drift * 0.5;
    case "herbert":
      return 215 - partner * 9 + drift * 0.5;
    case "iwona":
      // Iwona jest na srodku miedzy Urszula i Herbertem.
      return 130 - partner * 11 + drift * 0.5;
    case "adrian":
      // Do 2007 Adrian znajduje sie dokladnie na srodku.
      return WIDTH / 2 - partner * 33 - parenthood * 12;
    case "ola": {
      // Ola pojawia się przy prawej krawędzi w 2007 roku.
      const entrance = ease((year - OLA_ENTRANCE_YEAR) / (events.wedding - OLA_ENTRANCE_YEAR));

      const startX = WIDTH - 5;
      const targetX = 312 + parenthood * 13;

      return startX + (targetX - startX) * entrance + drift * 0.35;
    }
    case "manfred":
      // Manfred jest na srodku miedzy Helga i Franzem.
      return 430 + partner * 11 + drift * 0.5;
    case "helga":
      return 345 + partner * 9 + drift * 0.5;
    case "franz":
      return 515 + partner * 13 + drift * 0.4;
    case "niko":
      // Przed 2019 Niko sam wyznacza srodek; pozniej robi miejsce bratu.
      return WIDTH / 2 - siblings * 20;
    case "timo":
      return WIDTH / 2 + 20;
    default:
      return WIDTH / 2;
  }
}

function getGenerationOffset(person: FamilyMember, year: number): number {
  const parenthood = ease((year - events.nikoBorn) / 1.8);

  if (person.id === "niko" || person.id === "timo") return -36;
  if (person.id === "adrian" || person.id === "ola") {
    return -20 + parenthood * 10;
  }
  if (person.id === "iwona" || person.id === "manfred") return 9;
  return 31;
}

function getY(person: FamilyMember, year: number, visualYear: number) {
  return HEAD_Y + (visualYear - year) * PIXELS_PER_YEAR + getGenerationOffset(person, year);
}

// Płynne, organiczne krzywe.
function smoothPath(points: Point[]): string {
  if (!points.length) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[Math.max(0, i - 1)];
    const current = points[i];
    const next = points[i + 1];
    const following = points[Math.min(points.length - 1, i + 2)];

    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (following.x - current.x) / 6;
    const cp2y = next.y - (following.y - current.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
}

function getLifePath(person: FamilyMember, visualYear: number, motionTime: number) {
  const startYear = person.id === "ola" ? OLA_ENTRANCE_YEAR : Math.max(START_YEAR, person.born);

  if (visualYear < startYear) return null;

  const firstYear = Math.max(startYear, visualYear - (HEIGHT - HEAD_Y) / PIXELS_PER_YEAR);

  const lastYear = Math.min(visualYear, person.died ?? visualYear);

  if (lastYear < firstYear) return null;

  const points: Point[] = [];

  const addPoint = (year: number) => {
    points.push({
      x: getFloatingX(person, year, visualYear, motionTime),
      y: getY(person, year, visualYear),
    });
  };

  // Stałe punkty próbkowania zapobiegają przeskakiwaniu krzywych.
  const step = 0.5;

  addPoint(lastYear);

  const firstStep = Math.floor((lastYear - 0.000001) / step) * step;

  for (let year = firstStep; year > firstYear; year -= step) {
    addPoint(year);
  }

  if (lastYear > firstYear) {
    addPoint(firstYear);
  }

  return {
    path: smoothPath(points),
    x: getFloatingX(person, lastYear, visualYear, motionTime),
    y: getY(person, lastYear, visualYear),
  };
}

function getStrokeWidth(person: FamilyMember) {
  if (person.id === "adrian") return 2.9;

  if (["ola", "niko", "timo"].includes(person.id)) {
    return 2.3;
  }

  return 1.75;
}

export default function LifeLines() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Udostępniamy sterowanie animacją dla eksportera MP4.
  useEffect(() => {
    const exportWindow = window as Window & {
      setLifeLinesTime?: (value: number) => void;
    };

    exportWindow.setLifeLinesTime = (value: number) => {
      setPlaying(false);
      setTime(Math.max(0, Math.min(TOTAL_DURATION, value)));
    };

    console.log("LifeLines: sterowanie eksportem aktywne");

    return () => {
      delete exportWindow.setLifeLinesTime;
    };
  }, []);

  // Sterowanie pojedynczymi klatkami podczas eksportu.
  useEffect(() => {
    const exportWindow = window as Window & {
      setLifeLinesTime?: (value: number) => void;
    };

    exportWindow.setLifeLinesTime = (value: number) => {
      setPlaying(false);
      setTime(Math.max(0, Math.min(TOTAL_DURATION, value)));
    };

    return () => {
      delete exportWindow.setLifeLinesTime;
    };
  }, []);

  const currentYear = Math.min(END_YEAR, START_YEAR + time);
  const age = Math.floor(currentYear) - START_YEAR;

  // Historia przesuwa się ze stałą prędkością.
  // Po 2026 licznik wieku zostaje na 38.
  const visualYear = START_YEAR + time;

  useEffect(() => {
    if (!playing) return;

    let frame = 0;
    let previousTime: number | null = null;

    const animate = (now: number) => {
      if (previousTime === null) previousTime = now;

      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;

      setTime((previous) => Math.min(TOTAL_DURATION, previous + delta * speed));

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  useEffect(() => {
    if (time >= TOTAL_DURATION && playing) {
      setPlaying(false);
    }
  }, [time, playing]);

  const togglePlay = () => {
    if (time >= TOTAL_DURATION) {
      setTime(0);
    }

    setPlaying((previous) => !previous);
  };

  const adrian = ADRIAN;
  const ola = OLA;

  const weddingAdrianY = getY(adrian, events.wedding, visualYear);
  const weddingOlaY = getY(ola, events.wedding, visualYear);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Pionowy ekran animacji */}
      <div className="aspect-[9/16] w-full max-w-[430px] overflow-hidden rounded-2xl bg-[#F7F7F5] shadow-lg">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full"
          aria-label="Animowana historia rodziny"
          data-lifelines-frame={time.toFixed(4)}
        >
          <defs>
            <clipPath id="historyClip">
              <rect x="0" y={HEAD_Y - 65} width={WIDTH} height={HEIGHT - HEAD_Y + 65} />
            </clipPath>

            <linearGradient
              id="bottomFade"
              x1="0"
              x2="0"
              y1="875"
              y2="996"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F7F7F5" stopOpacity="0" />
              <stop offset="100%" stopColor="#F7F7F5" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Tło */}
          <rect width={WIDTH} height={HEIGHT} fill="#F7F7F5" />

          {/* Subtelna tekstura */}
          <g fill="#777777">
            {SPECKS.map((speck, index) => (
              <circle key={index} cx={speck.x} cy={speck.y} r={speck.r} opacity={speck.opacity} />
            ))}
          </g>

          {/* Tytuł */}
          <text
            x={WIDTH / 2}
            y="83"
            textAnchor="middle"
            fontSize="30"
            fontWeight="400"
            fill="#303030"
            letterSpacing="0.5"
          >
            your life in lines
          </text>

          {/* Licznik wieku */}
          <text
            x={WIDTH / 2}
            y="151"
            textAnchor="middle"
            fontSize="23"
            fontWeight="400"
            fill="#858585"
          >
            age {age}
          </text>

          {/* Delikatna linia odniesienia za pokoleniami */}
          <line
            x1="18"
            x2={WIDTH - 18}
            y1={HEAD_Y + 9}
            y2={HEAD_Y + 9}
            stroke="#DCDDDC"
            strokeWidth="1"
            opacity="0.35"
          />

          {/* Historia */}
          <g clipPath="url(#historyClip)">
            {family.map((person) => {
              const life = getLifePath(person, visualYear, time);

              if (!life) return null;

              return (
                <path
                  key={`line-${person.id}`}
                  d={life.path}
                  fill="none"
                  stroke={person.color}
                  strokeWidth={getStrokeWidth(person)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.88"
                />
              );
            })}

            {/* W 2012 widoczny jest delikatny most pomiedzy liniami. */}
            {visualYear >= events.wedding && (
              <path
                d={`M ${getFloatingX(adrian, events.wedding, visualYear, time)} ${weddingAdrianY}
      C ${getFloatingX(adrian, events.wedding, visualYear, time) + 12} ${weddingAdrianY + 8},
        ${getFloatingX(ola, events.wedding, visualYear, time) - 12} ${weddingOlaY + 8},
        ${getFloatingX(ola, events.wedding, visualYear, time)} ${weddingOlaY}`}
                stroke="#B995A6"
                strokeWidth="1.1"
                fill="none"
                opacity="0.38"
                strokeLinecap="round"
              />
            )}

            {/* Zamiast petli: delikatne galazki od obojga rodzicow do dziecka. */}
            {[
              { year: events.nikoBorn, id: "niko" },
              { year: events.timoBorn, id: "timo" },
            ].map(({ year, id }) => {
              if (visualYear < year) return null;

              const child = family.find((person) => person.id === id)!;
              const fatherX = getFloatingX(adrian, year, visualYear, time);
              const motherX = getFloatingX(ola, year, visualYear, time);
              const childX = getFloatingX(child, year, visualYear, time);
              const fatherY = getY(adrian, year, visualYear);
              const motherY = getY(ola, year, visualYear);
              const childY = getY(child, year, visualYear);

              // Brak naglego pojawienia: laczniki wyrastaja w pierwszym roku.
              const appearance = ease((visualYear - year) * 2.5);

              return (
                <g key={`birth-${id}`} opacity={appearance * 0.5}>
                  <path
                    d={`M ${fatherX} ${fatherY}
                        C ${fatherX + 3} ${fatherY - 14},
                          ${childX - 8} ${childY + 10},
                          ${childX} ${childY}`}
                    stroke={adrian.color}
                    strokeWidth="1.15"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${motherX} ${motherY}
                        C ${motherX - 3} ${motherY - 14},
                          ${childX + 8} ${childY + 10},
                          ${childX} ${childY}`}
                    stroke={ola.color}
                    strokeWidth="1.15"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Delikatne rozmycie historii przy dole */}
          <rect
            x="0"
            y="875"
            width={WIDTH}
            height="121"
            fill="url(#bottomFade)"
            pointerEvents="none"
          />

          {/* Punkty osób i ich podpisy */}
          {family.map((person) => {
            const life = getLifePath(person, visualYear, time);

            if (!life || life.y > HEIGHT + 20) return null;

            const isChild = person.id === "niko" || person.id === "timo";
            const isLivingOnAxis = person.died === undefined || visualYear <= person.died;

            // Dzieci najwyzej; Adrian i Ola pod nimi; dalej rodzice i dziadkowie.
            const childrenVisible = visualYear >= events.nikoBorn;
            let labelOffset = 26;
            if (person.id === "niko" || person.id === "timo") labelOffset = 21;
            if (person.id === "adrian" || person.id === "ola") {
              labelOffset = childrenVisible ? 17 : 31;
            }
            if (!isLivingOnAxis) labelOffset = 23;

            const labelX =
              childrenVisible && person.id === "adrian"
                ? life.x - 5
                : childrenVisible && person.id === "ola"
                  ? life.x + 5
                  : life.x;

            // Dzieci pojawiają się łagodnie po narodzinach.
            const appearance =
              person.id === "ola"
                ? ease((visualYear - OLA_ENTRANCE_YEAR) * 2)
                : isChild
                  ? ease((visualYear - person.born) * 2)
                  : 1;

            return (
              <g key={`person-${person.id}`} opacity={appearance}>
                {/* Miękka otoczka punktu */}
                <circle cx={life.x} cy={life.y} r="11" fill={person.color} opacity="0.11" />

                <circle cx={life.x} cy={life.y} r="7.2" fill={person.color} opacity="0.14" />

                {/* Główny punkt */}
                <circle cx={life.x} cy={life.y} r="5.2" fill={person.color} />

                {/* Imię */}
                <text
                  x={labelX}
                  y={life.y - labelOffset}
                  textAnchor="middle"
                  fontSize="13"
                  fill={person.color}
                  fontWeight={person.id === "adrian" ? "600" : "400"}
                  letterSpacing="0.1"
                >
                  {person.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Panel sterowania */}
      <div className="w-full max-w-[430px] space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Wiek: {age}</span>
          <span>
            {Math.floor(time)} / {TOTAL_DURATION} s
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={TOTAL_DURATION}
          step="0.01"
          value={time}
          onChange={(event) => {
            setPlaying(false);
            setTime(Number(event.target.value));
          }}
          className="w-full cursor-pointer accent-neutral-800"
          aria-label="Przewiń animację"
        />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={togglePlay}
            className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            {playing ? "Pauza" : "Odtwórz"}
          </button>

          <button
            onClick={() => {
              setPlaying(false);
              setTime(0);
            }}
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-50"
          >
            Od początku
          </button>

          <button
            onClick={() =>
              setSpeed((previous) => (previous === 1 ? 1.5 : previous === 1.5 ? 2 : 1))
            }
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-50"
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
}
