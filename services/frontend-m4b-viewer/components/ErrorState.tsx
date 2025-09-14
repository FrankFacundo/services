export default function ErrorState({ title = "Error", message = "Something went wrong." }: { title?: string; message?: string }) {
  return (
    <div className="rounded border bg-red-50 border-red-200 p-4 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
      <div className="font-semibold">{title}</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}
