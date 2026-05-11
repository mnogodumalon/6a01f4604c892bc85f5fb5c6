import { useDashboardData } from '@/hooks/useDashboardData';
import type { Begruessung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { BegruessungDialog } from '@/components/dialogs/BegruessungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconMail, IconSearch, IconUsers, IconMessage } from '@tabler/icons-react';
import { StatCard } from '@/components/StatCard';
import { formatDate } from '@/lib/formatters';

const APPGROUP_ID = '6a01f4604c892bc85f5fb5c6';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    begruessung,
    loading, error, fetchAll,
  } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Begruessung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Begruessung | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return begruessung;
    const s = search.toLowerCase();
    return begruessung.filter(r =>
      (r.fields.vorname ?? '').toLowerCase().includes(s) ||
      (r.fields.nachname ?? '').toLowerCase().includes(s) ||
      (r.fields.email ?? '').toLowerCase().includes(s) ||
      (r.fields.nachricht ?? '').toLowerCase().includes(s)
    );
  }, [begruessung, search]);

  const withNachricht = useMemo(() => begruessung.filter(r => r.fields.nachricht?.trim()).length, [begruessung]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreate = async (fields: Begruessung['fields']) => {
    await LivingAppsService.createBegruessungEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Begruessung['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateBegruessungEntry(editRecord.record_id, fields);
    setEditRecord(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBegruessungEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Begrüßungen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle eingegangenen Nachrichten und Grüße</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neue Begrüßung
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Begrüßungen gesamt"
          value={String(begruessung.length)}
          description="Alle Einträge"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit Nachricht"
          value={String(withNachricht)}
          description="Haben eine Nachricht hinterlassen"
          icon={<IconMessage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit E-Mail"
          value={String(begruessung.filter(r => r.fields.email?.trim()).length)}
          description="E-Mail-Adresse vorhanden"
          icon={<IconMail size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <Input
          placeholder="Suchen nach Name, E-Mail oder Nachricht..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Message cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <IconMessage size={48} className="text-muted-foreground" stroke={1.5} />
          <div className="text-center">
            <p className="font-medium text-foreground">
              {search ? 'Keine Ergebnisse gefunden' : 'Noch keine Begrüßungen'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Versuche eine andere Suche.' : 'Klicke auf „Neue Begrüßung", um den ersten Eintrag anzulegen.'}
            </p>
          </div>
          {!search && (
            <Button variant="outline" size="sm" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />Jetzt hinzufügen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(record => {
            const { vorname, nachname, email, nachricht } = record.fields;
            const initials = [vorname, nachname].filter(Boolean).map(n => n![0].toUpperCase()).join('') || '?';
            const fullName = [vorname, nachname].filter(Boolean).join(' ') || 'Unbekannt';
            return (
              <div
                key={record.record_id}
                className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden flex flex-col"
              >
                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{fullName}</p>
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="text-xs text-muted-foreground truncate block hover:text-primary transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          {email}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Nachricht */}
                  {nachricht ? (
                    <p className="text-sm text-foreground/80 line-clamp-4 leading-relaxed flex-1">
                      {nachricht}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic flex-1">Keine Nachricht</p>
                  )}

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">{formatDate(record.createdat)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 px-4 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setEditRecord(record); setDialogOpen(true); }}
                  >
                    <IconPencil size={14} className="mr-1 shrink-0" />Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(record)}
                  >
                    <IconTrash size={16} className="shrink-0" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <BegruessungDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Begruessung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Begruessung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Begrüßung löschen"
        description={`Soll der Eintrag von „${[deleteTarget?.fields.vorname, deleteTarget?.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt'}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
