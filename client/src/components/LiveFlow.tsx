export default function LiveFlow({ compact = false }: { compact?: boolean }) {
  return <div className={`live-flow ${compact ? "live-flow-compact" : ""}`}><span className="live-state"><i />Live sync</span><span className="queue-rail"><b /><b /><b /></span><span className="live-copy">Positions update as operations move.</span></div>;
}
