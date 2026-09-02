interface CombatLogProps {
  entries: string[];
}

export function CombatLog({ entries }: CombatLogProps) {
  return (
    <div className="w-full bg-gray-900 p-3 rounded-lg border border-gray-700 h-28 overflow-y-auto text-xs space-y-1">
      <p className="text-gray-500 font-semibold">Combat Log:</p>
      {entries.map((entry, index) => (
        <p
          key={`${entry}-${index}`}
          className="animate-[fade-in_300ms_ease-out] text-gray-300"
        >
          {entry}
        </p>
      ))}
    </div>
  );
}
