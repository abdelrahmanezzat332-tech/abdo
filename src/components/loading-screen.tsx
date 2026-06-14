export function LoadingScreen({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loader-ring" />
      <p>{label}</p>
    </div>
  );
}
