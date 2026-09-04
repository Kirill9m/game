"use client";

import { useState } from "react";
import { useAdminData } from "./useAdminData";
import type { Section } from "./types";
import QuestsSection from "./QuestsSection";
import DialogueSection from "./DialogueSection";
import ItemsSection from "./ItemsSection";
import WeaponsSection from "./WeaponsSection";
import EnemiesSection from "./EnemiesSection";
import PlayersSection from "./PlayersSection";
import MapsSection from "./MapsSection";
import ObstaclesSection from "./ObstaclesSection";
import WorldSection from "./WorldSection";

interface Props { playerId: string; }

export default function AdminPanel({ playerId }: Props) {
  const [section, setSection] = useState<Section>("quests");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const data = useAdminData(playerId);

  const tabs = [
    { id: "quests" as Section, icon: "📜", label: "Quests" },
    { id: "dialogues" as Section, icon: "💬", label: "Dialogues" },
    { id: "items" as Section, icon: "🎒", label: "Items" },
    { id: "weapons" as Section, icon: "⚔️", label: "Weapons" },
    { id: "enemies" as Section, icon: "👹", label: "Enemies" },
    { id: "world" as Section, icon: "🌍", label: "World" },
    { id: "zone" as Section, icon: "🏘️", label: "Safe Zone" },
    { id: "maps" as Section, icon: "🧭", label: "Maps" },
    { id: "obstacles" as Section, icon: "🧱", label: "Obstacles" },
    { id: "players" as Section, icon: "🛡️", label: "Players" },
  ];

  const sectionProps = { playerId, busy, setError, setNotice, onRefresh: data.refresh };

  return (
    <div className="flex flex-col gap-3 text-gray-200">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setSection(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${section === tab.id ? "border-purple-500 bg-purple-950/60 text-purple-200" : "border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-800"}`}>
              <span>{tab.icon}</span><span className="text-xs font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-500 font-mono">ADMIN PANEL</span>
      </div>

      {error && <div className="bg-red-950/80 border border-red-800 text-red-200 px-3 py-2 rounded-xl text-xs">{error}</div>}
      {notice && <div className="bg-green-950/60 border border-green-800 text-green-200 px-3 py-2 rounded-xl text-xs">{notice}</div>}

      {section === "quests" && <QuestsSection {...sectionProps} quests={data.quests} npcs={data.npcs} />}
      {section === "dialogues" && <DialogueSection {...sectionProps} npcs={data.npcs} dialogueNodes={data.dialogueNodes} selectedNpcId={data.selectedNpcId} onSelectNpc={data.setSelectedNpcId} />}
      {section === "items" && <ItemsSection {...sectionProps} items={data.items} />}
      {section === "weapons" && <WeaponsSection {...sectionProps} weaponTypes={data.weaponTypes} />}
      {section === "enemies" && <EnemiesSection {...sectionProps} enemies={data.enemies} items={data.items} />}
      {section === "players" && <PlayersSection {...sectionProps} players={data.players} weaponTypes={data.weaponTypes} />}
      {section === "maps" && <MapsSection {...sectionProps} maps={data.maps} items={data.items} />}
      {section === "obstacles" && <ObstaclesSection {...sectionProps} obstacleTypes={data.obstacleTypes} />}
      {(section === "world" || section === "zone") && (
        <WorldSection {...sectionProps} section={section} worldCells={data.worldCells} safeZone={data.safeZone} enemies={data.enemies} obstacleTypes={data.obstacleTypes} setWorldCells={data.setWorldCells} setSafeZone={data.setSafeZone} />
      )}
    </div>
  );
}
