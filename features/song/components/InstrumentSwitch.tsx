"use client";

import { useInstrument, type Instrument } from "@/shared/hooks/useInstrument";
import { SegmentedTabs } from "@/shared/components/SegmentedTabs";

const OPTIONS = [
  { value: "guitar" as Instrument, label: "Гітара" },
  { value: "ukulele" as Instrument, label: "Укулеле" },
  { value: "piano" as Instrument, label: "Клавіші" },
];

export function InstrumentSwitch() {
  const [instrument, setInstrument] = useInstrument();
  return (
    <SegmentedTabs
      options={OPTIONS}
      value={instrument}
      onChange={setInstrument}
      ariaLabel="Інструмент"
    />
  );
}
