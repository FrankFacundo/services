export default function ErrorState({ title = "Error", message = "Something went wrong." }: { title?: string; message?: string }) {
  return (
    <div className="rounded border bg-red-50 border-red-200 p-4 text-red-800">
      <div className="font-semibold">{title}</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}

