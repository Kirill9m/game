interface MovementPadProps {
  onMove: (deltaX: number, deltaY: number) => void;
}

export default function MovementPad({ onMove }: MovementPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
      <div></div>
      <button
        onClick={() => onMove(0, 1)}
        className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition p-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center"
      >
        ⬆️
      </button>
      <div></div>

      <button
        onClick={() => onMove(-1, 0)}
        className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition p-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center"
      >
        ⬅️
      </button>
      <button
        onClick={() => onMove(0, -1)}
        className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition p-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center"
      >
        ⬇️
      </button>
      <button
        onClick={() => onMove(1, 0)}
        className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition p-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center"
      >
        ➡️
      </button>
    </div>
  );
}
