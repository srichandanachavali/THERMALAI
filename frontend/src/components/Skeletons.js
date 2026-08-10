import React from "react";

// Reusable gray pulsing placeholders that match the shape of real content.
// Shown while a page has connected but hasn't received data yet.
const base = "animate-pulse bg-gray-700 rounded-lg";

export const CardSkeleton = ({ h = "h-24" }) => (
  <div className={`${base} ${h} w-full`} aria-hidden="true" />
);

export const ReactorCardSkeleton = () => (
  <div className="p-5 bg-gray-800 rounded-lg">
    <div className="flex items-center justify-between mb-4">
      <div className={`${base} h-4 w-24`} />
      <div className={`${base} h-6 w-16`} />
    </div>
    <div className={`${base} h-28 w-28 mx-auto rounded-full mb-4`} />
    <div className="space-y-3">
      <div className={`${base} h-8 w-full`} />
      <div className={`${base} h-8 w-full`} />
      <div className={`${base} h-8 w-full`} />
      <div className={`${base} h-8 w-full`} />
    </div>
  </div>
);

export const AlertRowSkeleton = () => (
  <div className="grid grid-cols-[110px_1fr_110px_90px] gap-3 px-5 py-4 items-center">
    <div className={`${base} h-3 w-20`} />
    <div className={`${base} h-3 w-28`} />
    <div className={`${base} h-5 w-16`} />
    <div className={`${base} h-3 w-10`} />
  </div>
);

export const ChartSkeleton = ({ h = "h-56" }) => (
  <div className={`${base} ${h} w-full`} aria-hidden="true" />
);

export const SensorTileSkeleton = () => (
  <div className="p-3 bg-gray-800 rounded-lg">
    <div className={`${base} h-2 w-16 mb-3`} />
    <div className={`${base} h-5 w-20`} />
  </div>
);
