interface PlayerInputProps {
  playerId: string;
  setPlayerId: (id: string) => void;
  onBlur: () => void;
}

export default function PlayerInput({
  playerId,
  setPlayerId,
  onBlur,
}: PlayerInputProps) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">
        Player ID:
      </label>
      <input
        type="text"
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        onBlur={onBlur}
        placeholder="Enter player UUID"
        className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-mono"
      />
    </div>
  );
}
