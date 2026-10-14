"use client";

// Deletion cannot be undone, so ask once before sending the request.
export function DeleteData() {
  return (
    <form
      action="/api/account/delete"
      method="post"
      onSubmit={(e) => {
        if (!window.confirm("Delete your account and everything you have given us? This cannot be undone.")) e.preventDefault();
      }}
    >
      <button type="submit">Delete all my data now</button>
    </form>
  );
}
