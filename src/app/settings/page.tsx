import { AppShell } from "../../components/layout/app-shell";
import { ApplicationHeader } from "../../components/layout/application-header";
import { PageContainer } from "../../components/layout/page-container";
import { DesktopSidebar } from "../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../components/navigation/mobile-navigation";
import { ThemeSelector } from "../../components/theme/theme-selector";
import { BackupExportPanel } from "../../features/backup/components/backup-export-panel";
import { BackupRestorePreviewPanel } from "../../features/backup/components/backup-restore-preview-panel";
import { LocalDataPanel } from "../../features/backup/components/local-data-panel";

export default function SettingsPage() {
  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Settings"
          description="Manage appearance, backups, and local application data."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <div className="space-y-8">
          <section
            aria-labelledby="appearance-title"
            className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold tracking-wide text-primary">
                  APPEARANCE
                </p>
                <h2
                  id="appearance-title"
                  className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
                >
                  Choose your theme
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use Light or Dark permanently, or allow SplitSukan to follow
                  the current appearance setting on this device.
                </p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-72">
                <ThemeSelector />
              </div>
            </div>
          </section>

          <BackupExportPanel />
          <BackupRestorePreviewPanel />
          <LocalDataPanel />

          <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold tracking-wide text-primary">
              ABOUT
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              About SplitSukan
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              SplitSukan is a local-first sports expense organizer. No account
              or cloud database is required for the current MVP. Backups and
              report files are generated on the current device.
            </p>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              Built by Ridzjuan · ridzu.one
            </p>
          </section>
        </div>
      </PageContainer>
    </AppShell>
  );
}
