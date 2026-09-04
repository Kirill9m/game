import { useEffect, useState } from "react";

interface MovementPadProps {
  onMove: (
    deltaX: number,
    deltaY: number,
  ) => Promise<{ cooldown?: string | number } | void> | void;
  currentCell?: string;
  cooldown?: string | number | null;
}

export default function MovementPad({
  onMove,
  currentCell,
  cooldown,
}: MovementPadProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!cooldown) {
      setSecondsLeft(0);
      return;
    }

    const targetTime = new Date(cooldown).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / 1000);
      setSecondsLeft(diff > 0 ? diff : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1200);

    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const gridCells = [
    { id: 1, deltaX: -1, deltaY: 1 },
    { id: 2, deltaX: 0, deltaY: 1 },
    { id: 3, deltaX: 1, deltaY: 1 },
    { id: 4, deltaX: -1, deltaY: 0 },
    { id: 5, isCurrent: true },
    { id: 6, deltaX: 1, deltaY: 0 },
    { id: 7, deltaX: -1, deltaY: -1 },
    { id: 8, deltaX: 0, deltaY: -1 },
    { id: 9, deltaX: 1, deltaY: -1 },
  ];

  const handleCellClick = async (deltaX?: number, deltaY?: number) => {
    if (secondsLeft > 0) return;
    if (deltaX === undefined || deltaY === undefined) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isAdjacent = (absX === 1 && absY === 1) || absX + absY === 1;

    if (!isAdjacent) {
      throw new Error("You can move only one coordinate at the same time");
    }

    try {
      const response = await onMove(deltaX, deltaY);

      if (response && response.cooldown) {
        const targetTime = new Date(response.cooldown).getTime();
        const diff = Math.ceil((targetTime - Date.now()) / 1000);
        setSecondsLeft(diff > 0 ? diff : 0);
      }
    } catch (error) {
      setSecondsLeft(0);
      console.error("Move failed:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {currentCell && (
        <div className="text-white text-xs md:text-sm font-medium mb-1">
          Location:{" "}
          <span className="font-bold text-teal-300">{currentCell}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 md:gap-1.5 w-36 md:w-56 mx-auto bg-black/40 p-1.5 md:p-2 rounded-xl border border-white/10 backdrop-blur-sm relative">
        {gridCells.map((cell) => {
          if (cell.isCurrent) {
            return (
              <div
                key={cell.id}
                className={`h-10 md:h-14 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  secondsLeft > 0
                    ? "bg-red-500/30 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    : "bg-teal-200/40 border-teal-300/60 shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                }`}
              >
                {secondsLeft > 0 ? (
                  <>
                    <span className="text-[8px] md:text-[10px] text-red-200 uppercase font-bold tracking-wider">
                      Moving
                    </span>
                    <span className="text-sm md:text-lg font-extrabold text-white">
                      {secondsLeft}с
                    </span>
                  </>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
                )}
              </div>
            );
          }

          return (
            <button
              key={cell.id}
              disabled={secondsLeft > 0}
              onClick={() => handleCellClick(cell.deltaX, cell.deltaY)}
              className={`h-10 md:h-14 rounded-lg border backdrop-blur-md transition-all shadow-md flex items-center justify-center ${
                secondsLeft > 0
                  ? "bg-white/5 border-white/5 cursor-not-allowed opacity-40"
                  : "bg-white/10 hover:bg-white/20 active:scale-95 border-white/20 cursor-pointer"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
