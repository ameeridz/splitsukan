import { AppShell } from "../../components/layout/app-shell";
import { ApplicationHeader } from "../../components/layout/application-header";
import { PageContainer } from "../../components/layout/page-container";
import { DesktopSidebar } from "../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../components/navigation/mobile-navigation";
import { ReportsOverview } from "../../features/reports/components/reports-overview";

export default function ReportsPage() {
  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Reports"
          description="Preview, download, and share session summaries."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <ReportsOverview />
      </PageContainer>
    </AppShell>
  );
}
