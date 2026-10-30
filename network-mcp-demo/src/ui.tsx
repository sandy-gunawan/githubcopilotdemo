import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Info,
  LoaderCircle,
  RefreshCw,
  SearchX,
  X,
} from "lucide-react";
import type { Device } from "../shared/schemas";

export const healthNames: Record<Device["status"], string> = {
  healthy: "Sehat",
  warning: "Peringatan",
  critical: "Kritis",
  offline: "Offline",
};
export const deviceTypeNames: Record<Device["type"], string> = {
  router: "Router",
  switch: "Switch",
  firewall: "Firewall",
  access_point: "Access point",
};
export const kindNames = {
  runbook: "Runbook",
  incident: "Insiden",
  config: "Konfigurasi",
  log: "Log",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});
const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function number(value: number | undefined): string {
  return value === undefined ? "—" : numberFormatter.format(value);
}

export function HealthBadge({ status }: { status: Device["status"] }) {
  return <span className={`badge health-${status}`}><span className="status-dot" />{healthNames[status]}</span>;
}

export function SimulationBadge() {
  return <span className="badge simulation-badge"><span className="status-dot" />SIMULATION</span>;
}

export function Loading({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={21} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Empty({
  title = "Belum ada data",
  children,
  action,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><SearchX size={25} aria-hidden="true" /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  title,
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
  title?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden="true" />
      <div>{title && <strong>{title}</strong>}<div>{children}</div></div>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Notice tone="error" title="Data belum dapat dimuat">
      <p>{message}</p>
      {retry && <button className="button button-small button-ghost" onClick={retry}><RefreshCw size={14} />Coba lagi</button>}
    </Notice>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

export function JsonBlock({ value, label }: { value: unknown; label?: string }) {
  const serialized = value === undefined ? "Belum ada hasil." : JSON.stringify(value, null, 2);
  return <div className="json-block">{label && <span className="field-label">{label}</span>}<pre>{serialized}</pre></div>;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  className = "",
  busy = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }
      }}
    >
      <header className="modal-header">
        <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button className="icon-button" aria-label="Tutup dialog" onClick={onClose} disabled={busy}><X size={21} /></button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function LegendDot({ className, children }: { className: string; children: ReactNode }) {
  return <span className="legend-item"><Circle size={8} fill="currentColor" className={className} aria-hidden="true" />{children}</span>;
}
