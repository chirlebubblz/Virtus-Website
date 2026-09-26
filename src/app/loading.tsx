import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center space-y-4 max-w-xs text-center">
        {/* Animated Brand Pulse Indicator */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-[#FBD227] animate-ping opacity-25" />
          <div className="w-10 h-10 rounded-full border-2 border-[#FBD227] border-t-transparent animate-spin" />
        </div>

        <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#FBD227]">
          The Virtus Labs
        </span>
        <p className="font-sans text-[0.7rem] text-gray-400 uppercase tracking-wider">
          Initializing Workspace Stream...
        </p>
      </div>
    </div>
  );
}
