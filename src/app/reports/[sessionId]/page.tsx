import { AppShell } from "../../../components/layout/app-shell";
import { ApplicationHeader } from "../../../components/layout/application-header";
import { PageContainer } from "../../../components/layout/page-container";
import { DesktopSidebar } from "../../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../../components/navigation/mobile-navigation";
import { SessionReportPreview } from "../../../features/reports/components/session-report-preview";

type ReportDetailPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { sessionId } = await params;

  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Report Preview"
          description="Review the current session snapshot before downloading or sharing."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <SessionReportPreview sessionId={sessionId} />
      </PageContainer>
    </AppShell>
  );
}
