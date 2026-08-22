import { AppShell } from "../../../components/layout/app-shell";
import { ApplicationHeader } from "../../../components/layout/application-header";
import { PageContainer } from "../../../components/layout/page-container";
import { DesktopSidebar } from "../../../components/navigation/desktop-sidebar";
import { MobileNavigation } from "../../../components/navigation/mobile-navigation";
import { SessionDetailView } from "../../../features/sessions/components/session-detail-view";

type SessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;

  return (
    <AppShell
      sidebar={<DesktopSidebar />}
      header={
        <ApplicationHeader
          title="Session Overview"
          description="Review the session details saved on this device."
        />
      }
      mobileNavigation={<MobileNavigation />}
    >
      <PageContainer size="standard">
        <SessionDetailView sessionId={sessionId} />
      </PageContainer>
    </AppShell>
  );
}
