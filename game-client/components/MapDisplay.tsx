interface MapDisplayProps {
  x: number;
  y: number;
}

export default function MapDisplay({ x, y }: MapDisplayProps) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-800">
      <p className="text-gray-400 text-xs uppercase tracking-wider">
        Current Tile:
      </p>
      <p className="text-3xl font-mono font-bold text-green-400 mt-1">
        X: {x}, Y: {y}
      </p>
    </div>
  );
}
