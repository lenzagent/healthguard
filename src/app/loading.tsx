export default function Loading() {
  return (
    <div className="app-frame" role="main" aria-busy="true">
      <div className="screen-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💚</div>
          <p style={{ fontSize: "16px", fontWeight: 500 }}>HealthGuard AI健康监测</p>
        </div>
      </div>
    </div>
  );
}
