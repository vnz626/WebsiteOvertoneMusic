import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";

export default function SavedEvents() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/users/saved-events").then((r) => setItems(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="home-surface">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-12">
        <h1 className="font-jakarta text-2xl font-bold text-ts-ink dark:text-white md:text-3xl">Event Tersimpan</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((e) => (
            <Card key={e.id} className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ts-primary/10">
              <Link
                className="font-jakarta font-bold text-ts-ink transition-colors hover:text-ts-primary dark:text-white dark:hover:text-brand-400"
                to={`/events/${e.id}`}
              >
                {e.name}
              </Link>
            </Card>
          ))}
        </div>
        {!items.length && (
          <div className="mt-6">
            <EmptyState title="Belum ada event tersimpan" />
          </div>
        )}
      </div>
    </div>
  );
}
